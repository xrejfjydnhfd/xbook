/**
 * React hook for managing the upload queue
 */

import { useCallback, useEffect, useState } from "react";
import {
  uploadQueueManager,
  QueuedUpload,
  NetworkQuality,
} from "@/lib/uploads/uploadQueueManager";
import { startTusUpload } from "@/lib/uploads/tusVideoUploader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UseUploadQueueResult {
  queue: QueuedUpload[];
  networkQuality: NetworkQuality;
  isOnline: boolean;
  addToQueue: (file: File) => Promise<{ isDuplicate: boolean; existingUrl?: string }>;
  startUpload: (id: string) => Promise<void>;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearCompleted: () => void;
  getActiveUploads: () => QueuedUpload[];
  getPendingUploads: () => QueuedUpload[];
}

// Active TUS upload instances
const activeUploads = new Map<string, import("tus-js-client").Upload>();

// Speed calculation state
const speedTrackers = new Map<string, { lastTime: number; lastBytes: number; samples: number[] }>();

export function useUploadQueue(userId: string): UseUploadQueueResult {
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("good");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Initialize manager and subscribe to updates
  useEffect(() => {
    if (!userId) return;

    uploadQueueManager.initialize(userId);

    const unsubscribe = uploadQueueManager.subscribe((newQueue) => {
      setQueue(newQueue);
      setNetworkQuality(uploadQueueManager.getNetworkQuality());
    });

    // Initial load
    setQueue(uploadQueueManager.getQueue());
    setNetworkQuality(uploadQueueManager.getNetworkQuality());

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId]);

  // Add file to queue
  const addToQueue = useCallback(
    async (file: File) => {
      const result = await uploadQueueManager.addToQueue(file, userId);

      if (result.isDuplicate) {
        toast({
          title: "Duplicate detected",
          description: "This video was already uploaded. Using existing file.",
        });
        return { isDuplicate: true, existingUrl: result.existingUrl };
      }

      toast({
        title: "Added to queue",
        description: `${file.name} added to upload queue`,
      });

      return { isDuplicate: false };
    },
    [userId, toast]
  );

  // Start uploading a queued item
  const startUpload = useCallback(
    async (id: string) => {
      const upload = uploadQueueManager.getQueue().find((u) => u.id === id);
      if (!upload || !upload.file) {
        toast({
          title: "Cannot start upload",
          description: "File not found. Please re-select the file.",
          variant: "destructive",
        });
        return;
      }

      try {
        // Get session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          throw new Error("Authentication required");
        }

        // Get object name from backend
        let objectName = upload.objectName;
        if (!objectName) {
          const { data, error } = await supabase.functions.invoke("video-upload-session", {
            body: { fileName: upload.fileName },
          });
          if (error) throw error;
          objectName = data?.objectName;
        }

        if (!objectName) {
          const ext = upload.fileName.split(".").pop() || "mp4";
          objectName = `${userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
        }

        uploadQueueManager.updateProgress(id, {
          status: "uploading",
          objectName,
        });

        // Initialize speed tracker
        speedTrackers.set(id, {
          lastTime: Date.now(),
          lastBytes: 0,
          samples: [],
        });

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
        const chunkSize = uploadQueueManager.getAdaptiveChunkSize();

        const tusUpload = await startTusUpload({
          file: upload.file,
          endpoint,
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "x-upsert": "true",
          },
          chunkSize,
          metadata: {
            bucketName: "media",
            objectName,
            contentType: upload.fileType,
            cacheControl: "3600",
          },
          callbacks: {
            onProgress: (bytesUploaded, bytesTotal) => {
              // Calculate real-time speed
              const tracker = speedTrackers.get(id);
              if (tracker) {
                const now = Date.now();
                const dt = (now - tracker.lastTime) / 1000;
                const dBytes = bytesUploaded - tracker.lastBytes;

                if (dt >= 0.5 && dBytes >= 0) {
                  const instantSpeed = dBytes / dt;
                  tracker.samples.push(instantSpeed);
                  if (tracker.samples.length > 12) tracker.samples.shift();
                  tracker.lastTime = now;
                  tracker.lastBytes = bytesUploaded;
                }

                const avgSpeed = tracker.samples.length
                  ? tracker.samples.reduce((a, b) => a + b, 0) / tracker.samples.length
                  : 0;

                const remaining = bytesTotal - bytesUploaded;
                const eta = avgSpeed > 0 ? remaining / avgSpeed : 0;

                uploadQueueManager.updateProgress(id, {
                  bytesUploaded,
                  uploadSpeed: avgSpeed,
                  estimatedTimeRemaining: eta,
                });
              }
            },
            onSuccess: async () => {
              await uploadQueueManager.completeUpload(id, objectName!);
              activeUploads.delete(id);
              speedTrackers.delete(id);

              toast({
                title: "Upload complete!",
                description: `${upload.fileName} uploaded successfully`,
              });

              // Update Supabase with bytes uploaded
              await supabase
                .from("upload_queue")
                .update({
                  bytes_uploaded: upload.fileSize,
                  upload_speed: 0,
                })
                .eq("id", id);
            },
            onError: async (error) => {
              await uploadQueueManager.failUpload(id, error.message);
              activeUploads.delete(id);
              speedTrackers.delete(id);

              toast({
                title: "Upload failed",
                description: error.message,
                variant: "destructive",
              });
            },
          },
        });

        activeUploads.set(id, tusUpload);
      } catch (error: any) {
        await uploadQueueManager.failUpload(id, error.message);
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [userId, toast]
  );

  // Pause an active upload
  const pauseUpload = useCallback((id: string) => {
    const tusUpload = activeUploads.get(id);
    if (tusUpload) {
      tusUpload.abort();
      activeUploads.delete(id);
    }
    uploadQueueManager.pauseUpload(id);
  }, []);

  // Resume a paused upload
  const resumeUpload = useCallback(
    (id: string) => {
      uploadQueueManager.resumeUpload(id);
      startUpload(id);
    },
    [startUpload]
  );

  // Cancel and remove from queue
  const cancelUpload = useCallback(
    async (id: string) => {
      const tusUpload = activeUploads.get(id);
      if (tusUpload) {
        tusUpload.abort();
        activeUploads.delete(id);
      }
      speedTrackers.delete(id);
      await uploadQueueManager.removeFromQueue(id);

      toast({
        title: "Upload cancelled",
        description: "The upload has been removed from the queue",
      });
    },
    [toast]
  );

  // Retry a failed upload
  const retryUpload = useCallback(
    (id: string) => {
      const upload = queue.find((u) => u.id === id);
      if (upload && upload.file) {
        uploadQueueManager.updateProgress(id, {
          status: "pending",
          errorMessage: null,
        });
        startUpload(id);
      } else {
        toast({
          title: "Cannot retry",
          description: "Please re-select the file to retry",
          variant: "destructive",
        });
      }
    },
    [queue, startUpload, toast]
  );

  // Clear completed uploads
  const clearCompleted = useCallback(async () => {
    const completed = queue.filter((u) => u.status === "complete");
    for (const upload of completed) {
      await uploadQueueManager.removeFromQueue(upload.id);
    }
  }, [queue]);

  // Get active uploads
  const getActiveUploads = useCallback(() => {
    return queue.filter((u) => u.status === "uploading");
  }, [queue]);

  // Get pending uploads
  const getPendingUploads = useCallback(() => {
    return queue.filter((u) => u.status === "pending" || u.status === "paused");
  }, [queue]);

  return {
    queue,
    networkQuality,
    isOnline,
    addToQueue,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    getActiveUploads,
    getPendingUploads,
  };
}
