import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startTusUpload } from "@/lib/uploads/tusVideoUploader";

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  currentChunk: number;
  totalChunks: number;
}

type UploadStatus =
  | "idle"
  | "preparing"
  | "generating-thumbnail"
  | "uploading"
  | "finalizing"
  | "complete"
  | "error"
  | "paused";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
  isReel: boolean;
}

// Requirement: 5MB–10MB chunks
const CHUNK_SIZE_BYTES = 6 * 1024 * 1024; // 6MB

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const useVideoUpload = (userId: string) => {
  const { toast } = useToast();

  const [progress, setProgress] = useState<UploadProgress>({
    bytesUploaded: 0,
    totalBytes: 0,
    percentage: 0,
    speed: 0,
    estimatedTimeRemaining: 0,
    currentChunk: 0,
    totalChunks: 0,
  });

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  const uploadRef = useRef<import("tus-js-client").Upload | null>(null);
  const pausedByOfflineRef = useRef(false);

  // Speed estimation (moving average)
  const lastSampleRef = useRef<{ t: number; bytes: number }>({ t: Date.now(), bytes: 0 });
  const speedSamplesRef = useRef<number[]>([]);

  const fileRef = useRef<File | null>(null);
  const objectNameRef = useRef<string>("");

  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        const thumbnail = canvas.toDataURL("image/jpeg", 0.8);

        resolve({
          duration: Math.round(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnail,
          isReel: video.duration <= 90,
        });

        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const formatSpeed = useCallback((bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }, []);

  const formatTimeRemaining = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "Calculating...";
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m remaining`;
  }, []);

  const computeSpeedAndEta = useCallback((bytesUploaded: number, totalBytes: number) => {
    const now = Date.now();
    const { t: lastT, bytes: lastBytes } = lastSampleRef.current;

    const dt = (now - lastT) / 1000;
    const dBytes = bytesUploaded - lastBytes;

    // Avoid noisy samples
    if (dt >= 0.5 && dBytes >= 0) {
      const inst = dBytes / dt;
      speedSamplesRef.current.push(inst);
      if (speedSamplesRef.current.length > 12) speedSamplesRef.current.shift();
      lastSampleRef.current = { t: now, bytes: bytesUploaded };
    }

    const avg = speedSamplesRef.current.length
      ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
      : 0;

    const remaining = totalBytes - bytesUploaded;
    const eta = avg > 0 ? remaining / avg : 0;
    return { speed: avg, eta };
  }, []);

  const getTusEndpoint = useCallback(() => {
    // Supabase storage resumable endpoint uses the storage subdomain.
    // Using VITE_SUPABASE_PROJECT_ID keeps this stable across environments.
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  }, []);

  const createObjectName = useCallback((file: File) => {
    const ext = file.name.split(".").pop() || "mp4";
    return `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  }, [userId]);

  /**
   * NOTE: The previous implementation could freeze at a fixed percentage because it relied on
   * xhr.upload progress events for cross-origin uploads and sometimes received no progress updates
   * (lengthComputable=false), so uploadedBytes never advanced.
   *
   * This new implementation uses TUS resumable uploads which reports true uploaded bytes.
   */
  const uploadVideo = useCallback(
    async (
      file: File,
      options?: {
        quality?: "auto" | "hd" | "sd";
        onProgress?: (progress: UploadProgress) => void;
      }
    ): Promise<{ url: string; metadata: VideoMetadata } | null> => {
      if (!file.type.startsWith("video/")) {
        toast({ title: "Invalid file", description: "Please select a video file", variant: "destructive" });
        return null;
      }

      try {
        setStatus("preparing");
        fileRef.current = file;
        pausedByOfflineRef.current = false;
        speedSamplesRef.current = [];
        lastSampleRef.current = { t: Date.now(), bytes: 0 };

        // Progress starts at 0% (MANDATORY)
        const totalBytes = file.size;
        const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES));
        setProgress({
          bytesUploaded: 0,
          totalBytes,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0,
          currentChunk: 0,
          totalChunks,
        });

        setStatus("generating-thumbnail");
        const metadata = await extractVideoMetadata(file);
        setVideoMetadata(metadata);

        // Backend session token (required for authenticated uploads)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.access_token) throw new Error("You must be logged in to upload.");

        // Optionally ask backend for an object key (keeps naming consistent & future-proof)
        let objectName = "";
        try {
          const { data, error } = await supabase.functions.invoke("video-upload-session", {
            body: { fileName: file.name },
          });
          if (error) throw error;
          objectName = data?.objectName;
        } catch {
          // Fallback: client-side object key
          objectName = createObjectName(file);
        }

        objectNameRef.current = objectName;

        setStatus("uploading");

        // Start resumable upload
        uploadRef.current = await startTusUpload({
          file,
          endpoint: getTusEndpoint(),
          headers: {
            // Required headers for Storage resumable uploads
            authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "x-upsert": "true",
          },
          chunkSize: CHUNK_SIZE_BYTES,
          metadata: {
            bucketName: "media",
            objectName,
            contentType: file.type,
            cacheControl: "3600",
            // Custom metadata for debugging/analytics (stored by backend)
            metadata: JSON.stringify({ quality: options?.quality ?? "auto" }),
          },
          callbacks: {
            onProgress: (bytesUploaded, bytesTotal) => {
              const pctRaw = (bytesUploaded / bytesTotal) * 100;
              const pct = Math.floor(clamp(pctRaw, 0, 100));

              const { speed, eta } = computeSpeedAndEta(bytesUploaded, bytesTotal);

              const currentChunk = Math.max(1, Math.ceil(bytesUploaded / CHUNK_SIZE_BYTES));
              const newProgress: UploadProgress = {
                bytesUploaded,
                totalBytes: bytesTotal,

                // Requirement: show 100% ONLY after server confirms success
                percentage: Math.min(pct, 99),

                speed,
                estimatedTimeRemaining: eta,
                currentChunk: Math.min(currentChunk, totalChunks),
                totalChunks,
              };

              setProgress(newProgress);
              options?.onProgress?.(newProgress);
            },
            onSuccess: () => {
              // Server confirmed final chunk and upload finished
              setStatus("finalizing");

              const { data: urlData } = supabase.storage.from("media").getPublicUrl(objectName);

              setProgress((p) => ({
                ...p,
                bytesUploaded: totalBytes,
                percentage: 100,
                estimatedTimeRemaining: 0,
              }));

              setStatus("complete");

              toast({ title: "Upload complete!", description: "Your video has been uploaded successfully" });

              // Return via refs (we can't return from callback)
              // The promise below resolves using a one-shot ref.
              successResolverRef.current?.({ url: urlData.publicUrl, metadata });
              successResolverRef.current = null;
            },
            onError: (error) => {
              setStatus("error");
              toast({ title: "Upload failed", description: error.message, variant: "destructive" });
              errorResolverRef.current?.(error);
              errorResolverRef.current = null;
            },
          },
        });

        // Convert callback-based completion to a promise so calling code can await.
        const result = await new Promise<{ url: string; metadata: VideoMetadata }>((resolve, reject) => {
          successResolverRef.current = resolve;
          errorResolverRef.current = reject;
        });

        return result;
      } catch (error: any) {
        console.error("Video upload error:", error);
        if (status !== "paused") setStatus("error");
        toast({
          title: "Upload failed",
          description: error?.message || "Please try again",
          variant: "destructive",
        });
        return null;
      }
    },
    [
      computeSpeedAndEta,
      createObjectName,
      extractVideoMetadata,
      getTusEndpoint,
      status,
      toast,
      userId,
    ]
  );

  // Promise resolvers for onSuccess/onError (keeps EnhancedVideoUpload API unchanged)
  const successResolverRef = useRef<((value: { url: string; metadata: VideoMetadata }) => void) | null>(null);
  const errorResolverRef = useRef<((err: unknown) => void) | null>(null);

  const pauseUpload = useCallback(() => {
    if (!uploadRef.current) return;
    uploadRef.current.abort();
    setStatus("paused");
    toast({ title: "Upload paused", description: "Your upload has been paused" });
  }, [toast]);

  const resumeUpload = useCallback(async () => {
    const file = fileRef.current;
    if (!file) {
      toast({ title: "Cannot resume", description: "No upload to resume", variant: "destructive" });
      return;
    }

    // Restart the tus upload; it will resume automatically from the stored fingerprint.
    setStatus("uploading");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in to upload.");

      const objectName = objectNameRef.current || createObjectName(file);
      objectNameRef.current = objectName;

      uploadRef.current = await startTusUpload({
        file,
        endpoint: getTusEndpoint(),
        headers: {
          authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "x-upsert": "true",
        },
        chunkSize: CHUNK_SIZE_BYTES,
        metadata: {
          bucketName: "media",
          objectName,
          contentType: file.type,
          cacheControl: "3600",
        },
        callbacks: {
          onProgress: (bytesUploaded, bytesTotal) => {
            const pctRaw = (bytesUploaded / bytesTotal) * 100;
            const pct = Math.floor(clamp(pctRaw, 0, 100));
            const { speed, eta } = computeSpeedAndEta(bytesUploaded, bytesTotal);
            const totalChunks = Math.max(1, Math.ceil(bytesTotal / CHUNK_SIZE_BYTES));
            const currentChunk = Math.max(1, Math.ceil(bytesUploaded / CHUNK_SIZE_BYTES));

            const newProgress: UploadProgress = {
              bytesUploaded,
              totalBytes: bytesTotal,
              percentage: Math.min(pct, 99),
              speed,
              estimatedTimeRemaining: eta,
              currentChunk: Math.min(currentChunk, totalChunks),
              totalChunks,
            };

            setProgress(newProgress);
          },
          onSuccess: () => {
            setStatus("finalizing");
            const { data: urlData } = supabase.storage.from("media").getPublicUrl(objectName);

            setProgress((p) => ({
              ...p,
              bytesUploaded: file.size,
              percentage: 100,
              estimatedTimeRemaining: 0,
            }));

            setStatus("complete");
            toast({ title: "Upload complete!", description: "Your video has been uploaded successfully" });

            // If the original uploadVideo() is awaiting, resolve it.
            if (videoMetadata) {
              successResolverRef.current?.({ url: urlData.publicUrl, metadata: videoMetadata });
              successResolverRef.current = null;
            }
          },
          onError: (err) => {
            setStatus("error");
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
            errorResolverRef.current?.(err);
            errorResolverRef.current = null;
          },
        },
      });

      toast({ title: "Resuming upload", description: "Your upload is continuing" });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Cannot resume", description: e?.message || "Please try again", variant: "destructive" });
    }
  }, [computeSpeedAndEta, createObjectName, getTusEndpoint, toast, videoMetadata]);

  const cancelUpload = useCallback(() => {
    // Abort without trying to finalize.
    uploadRef.current?.abort();
    uploadRef.current = null;

    fileRef.current = null;
    objectNameRef.current = "";
    pausedByOfflineRef.current = false;
    speedSamplesRef.current = [];

    setStatus("idle");
    setVideoMetadata(null);
    setProgress({
      bytesUploaded: 0,
      totalBytes: 0,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
      currentChunk: 0,
      totalChunks: 0,
    });

    toast({ title: "Upload cancelled", description: "Your upload has been cancelled" });
  }, [toast]);

  // Auto pause/resume on connectivity changes (internet-dependent behavior)
  useEffect(() => {
    const onOffline = () => {
      if (status === "uploading") {
        pausedByOfflineRef.current = true;
        pauseUpload();
      }
    };

    const onOnline = () => {
      if (pausedByOfflineRef.current) {
        pausedByOfflineRef.current = false;
        resumeUpload();
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [pauseUpload, resumeUpload, status]);

  const getStatusMessage = useCallback(() => {
    switch (status) {
      case "preparing":
        return "Preparing video...";
      case "generating-thumbnail":
        return "Generating thumbnail...";
      case "uploading":
        return `Uploading ${progress.percentage}%`;
      case "finalizing":
        return "Finalizing...";
      case "complete":
        return "Upload complete ✓";
      case "error":
        return "Upload failed";
      case "paused":
        return "Upload paused";
      default:
        return "";
    }
  }, [progress.percentage, status]);

  return {
    uploadVideo,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    progress,
    status,
    videoMetadata,
    getStatusMessage,
    formatSpeed,
    formatTimeRemaining,
    isUploading: status === "uploading" || status === "finalizing",
    isPaused: status === "paused",
    isComplete: status === "complete",
    isError: status === "error",
  };
};
