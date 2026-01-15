import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Image,
  Video,
  X,
  MapPin,
  Smile,
  UserPlus,
  Hash,
  Globe,
  Users,
  Lock,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FeelingSelector from "./FeelingSelector";
import LocationInput from "./LocationInput";
import TagFriendsDialog from "./TagFriendsDialog";
import PrivacySelector from "./PrivacySelector";
import MediaPreview from "./MediaPreview";
import { startTusUpload } from "@/lib/uploads/tusVideoUploader";
import { uploadQueueManager } from "@/lib/uploads/uploadQueueManager";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: { username: string; avatar_url: string | null; full_name: string | null } | null;
  onPostCreated: () => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "finalizing" | "complete" | "error" | "paused";

const MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const CreatePostDialog = ({ open, onOpenChange, userId, userProfile, onPostCreated }: CreatePostDialogProps) => {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // REAL progress (no fake 60%): updated from actual uploaded bytes.
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);

  const [feeling, setFeeling] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "friends" | "only_me">("public");
  const [taggedFriends, setTaggedFriends] = useState<{ id: string; username: string }[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);

  const [showFeelings, setShowFeelings] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showTagFriends, setShowTagFriends] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Resumable upload state
  const uploadRef = useRef<import("tus-js-client").Upload | null>(null);
  const activeFileRef = useRef<File | null>(null);
  const objectNameRef = useRef<string>("");
  const pausedByOfflineRef = useRef(false);

  // Speed estimation
  const lastSampleRef = useRef<{ t: number; bytes: number }>({ t: Date.now(), bytes: 0 });
  const speedSamplesRef = useRef<number[]>([]);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  const formatSpeed = useCallback((bps: number) => {
    if (bps <= 0) return "";
    if (bps < 1024) return `${Math.round(bps)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  }, []);

  const formatEta = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "";
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}m remaining`;
  }, []);

  const getTusEndpoint = useCallback(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  }, []);

  const getAdaptiveChunkSize = useCallback(() => {
    const suggested = uploadQueueManager.getAdaptiveChunkSize() || 6 * 1024 * 1024;
    return clamp(suggested, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE);
  }, []);

  const createObjectName = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop() || "bin";
      return `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    },
    [userId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    selectedFiles.forEach((file) => {
      if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          video.currentTime = 1;
        };
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          setPreviews((prev) => [...prev, canvas.toDataURL()]);
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const extractHashtags = (text: string): string[] => {
    const regex = /#(\w+)/g;
    const matches = text.match(regex);
    return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
  };

  const resetUploadUi = useCallback(() => {
    setUploadProgress(0);
    setBytesUploaded(0);
    setTotalBytes(0);
    setUploadSpeed(0);
    setEtaSeconds(0);
    setUploadStatus("idle");

    uploadRef.current?.abort();
    uploadRef.current = null;
    activeFileRef.current = null;
    objectNameRef.current = "";
    pausedByOfflineRef.current = false;
    speedSamplesRef.current = [];
    lastSampleRef.current = { t: Date.now(), bytes: 0 };
  }, []);

  const computeSpeedAndEta = useCallback((uploaded: number, total: number) => {
    const now = Date.now();
    const { t: lastT, bytes: lastBytes } = lastSampleRef.current;
    const dt = (now - lastT) / 1000;
    const dBytes = uploaded - lastBytes;

    if (dt >= 0.5 && dBytes >= 0) {
      const inst = dBytes / dt;
      speedSamplesRef.current.push(inst);
      if (speedSamplesRef.current.length > 12) speedSamplesRef.current.shift();
      lastSampleRef.current = { t: now, bytes: uploaded };
    }

    const avg = speedSamplesRef.current.length
      ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
      : 0;

    const remaining = total - uploaded;
    const eta = avg > 0 ? remaining / avg : 0;
    return { speed: avg, eta };
  }, []);

  const uploadMediaResumable = useCallback(
    async (file: File) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error("You must be logged in to upload.");

      const objectName = objectNameRef.current || createObjectName(file);
      objectNameRef.current = objectName;
      activeFileRef.current = file;

      setTotalBytes(file.size);
      setBytesUploaded(0);
      setUploadSpeed(0);
      setEtaSeconds(0);
      setUploadProgress(0);

      lastSampleRef.current = { t: Date.now(), bytes: 0 };
      speedSamplesRef.current = [];

      const chunkSize = getAdaptiveChunkSize();

      return await new Promise<string>((resolve, reject) => {
        startTusUpload({
          file,
          endpoint: getTusEndpoint(),
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "x-upsert": "true",
          },
          chunkSize,
          metadata: {
            bucketName: "media",
            objectName,
            contentType: file.type,
            cacheControl: "3600",
          },
          callbacks: {
            onProgress: (uploaded, total) => {
              const pctRaw = (uploaded / total) * 100;
              const pct = Math.floor(clamp(pctRaw, 0, 100));
              const { speed, eta } = computeSpeedAndEta(uploaded, total);

              // IMPORTANT: never show 100% until server confirms success.
              const pctUi = Math.min(pct, 99);

              setBytesUploaded(uploaded);
              setTotalBytes(total);
              setUploadSpeed(speed);
              setEtaSeconds(eta);

              // Keep it monotonic to avoid "jumping backwards" due to rounding.
              setUploadProgress((prev) => Math.max(prev, pctUi));
            },
            onSuccess: () => {
              setBytesUploaded(file.size);
              setUploadProgress(100);
              resolve(objectName);
            },
            onError: (err) => reject(err),
          },
        })
          .then((u) => {
            uploadRef.current = u;
          })
          .catch(reject);
      });
    },
    [computeSpeedAndEta, createObjectName, getAdaptiveChunkSize, getTusEndpoint]
  );

  // Auto pause/resume on connectivity changes (internet-dependent behavior)
  useEffect(() => {
    const onOffline = () => {
      if (uploadStatus === "uploading" && uploadRef.current) {
        pausedByOfflineRef.current = true;
        uploadRef.current.abort();
        setUploadStatus("paused");
      }
    };

    const onOnline = async () => {
      if (!pausedByOfflineRef.current) return;
      pausedByOfflineRef.current = false;

      const f = activeFileRef.current;
      if (!f) return;

      try {
        setUploadStatus("uploading");
        await uploadMediaResumable(f);
      } catch (e) {
        // If resume fails, surface error but keep UI responsive
        setUploadStatus("error");
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [uploadMediaResumable, uploadStatus]);

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      toast({ title: "Error", description: "Please add content or media", variant: "destructive" });
      return;
    }

    setUploadStatus("uploading");

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let thumbnailUrl: string | null = null;
      let videoDuration: number | null = null;
      let isReel = false;

      if (files.length > 0) {
        const file = files[0];

        // Upload file with REAL byte-based progress (no fake 60%).
        const objectName = await uploadMediaResumable(file);

        // Processing/post creation phase (upload is already confirmed by server)
        setUploadStatus("finalizing");

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(objectName);

        mediaUrl = publicUrl;
        mediaType = file.type.startsWith("image") ? "image" : "video";

        // Video metadata
        if (file.type.startsWith("video")) {
          const video = document.createElement("video");
          video.src = URL.createObjectURL(file);
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
              videoDuration = Math.round(video.duration);
              isReel = video.duration <= 60;
              URL.revokeObjectURL(video.src);
              resolve();
            };
          });
          thumbnailUrl = previews[0] || null;
        }
      }

      // Extract hashtags from content
      const extractedHashtags = extractHashtags(content);

      // Create post
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
          feeling,
          location,
          privacy,
          is_reel: isReel,
          video_duration: videoDuration,
          thumbnail_url: thumbnailUrl,
          processing_status: "completed",
        })
        .select()
        .single();

      if (postError) throw postError;

      // Save hashtags
      if (extractedHashtags.length > 0 && postData) {
        for (const tag of extractedHashtags) {
          const { data: hashtagData } = await supabase
            .from("hashtags")
            .upsert({ name: tag }, { onConflict: "name" })
            .select()
            .single();

          if (hashtagData) {
            await supabase.from("post_hashtags").insert({
              post_id: postData.id,
              hashtag_id: hashtagData.id,
            });
          }
        }
      }

      // Save tagged friends
      if (taggedFriends.length > 0 && postData) {
        for (const friend of taggedFriends) {
          await supabase.from("post_tags").insert({
            post_id: postData.id,
            tagged_user_id: friend.id,
          });

          await supabase.from("notifications").insert({
            user_id: friend.id,
            from_user_id: userId,
            type: "tag",
            post_id: postData.id,
          });
        }
      }

      setUploadStatus("complete");
      toast({ title: "Success", description: "Post created successfully!" });

      // Reset form
      setContent("");
      setFiles([]);
      setPreviews([]);
      setFeeling("");
      setLocation("");
      setPrivacy("public");
      setTaggedFriends([]);
      setHashtags([]);
      resetUploadUi();

      onPostCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating post:", error);
      setUploadStatus("error");
      toast({
        title: "Error",
        description: error?.message || "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const isBusy = uploadStatus === "uploading" || uploadStatus === "processing" || uploadStatus === "finalizing";

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case "uploading":
        return `Uploading... ${uploadProgress}%`;
      case "paused":
        return "Upload paused (waiting for internet)...";
      case "processing":
        return "Processing your media...";
      case "finalizing":
        return "Finalizing...";
      case "complete":
        return "Posted ✔";
      case "error":
        return "Upload failed";
      default:
        return "";
    }
  };

  const getPrivacyIcon = () => {
    switch (privacy) {
      case "public":
        return <Globe className="w-4 h-4" />;
      case "friends":
        return <Users className="w-4 h-4" />;
      case "only_me":
        return <Lock className="w-4 h-4" />;
    }
  };

  const statsText = useMemo(() => {
    if (uploadStatus !== "uploading") return "";

    const left = totalBytes > 0 ? `${formatBytes(bytesUploaded)} / ${formatBytes(totalBytes)}` : "";
    const spd = formatSpeed(uploadSpeed);
    const eta = formatEta(etaSeconds);

    return [left, spd, eta].filter(Boolean).join(" • ");
  }, [bytesUploaded, etaSeconds, formatBytes, formatEta, formatSpeed, totalBytes, uploadSpeed, uploadStatus]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center border-b pb-3">Create Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={userProfile?.avatar_url || ""} />
                <AvatarFallback>{userProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {userProfile?.full_name || userProfile?.username}
                  {feeling && <span className="font-normal text-muted-foreground"> is {feeling}</span>}
                  {taggedFriends.length > 0 && (
                    <span className="font-normal text-muted-foreground">
                      {" "}with {taggedFriends.map((f) => f.username).join(", ")}
                    </span>
                  )}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowPrivacy(true)}
                >
                  {getPrivacyIcon()}
                  <span className="ml-1 capitalize">{privacy.replace("_", " ")}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Content input */}
            <Textarea
              placeholder={`What's on your mind, ${userProfile?.full_name || userProfile?.username}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] border-0 resize-none text-lg focus-visible:ring-0 p-0"
            />

            {/* Location display */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setLocation("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Media preview */}
            {previews.length > 0 && (
              <MediaPreview previews={previews} files={files} onRemove={removeFile} />
            )}

            {/* Upload progress */}
            {uploadStatus !== "idle" && uploadStatus !== "complete" && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className={"w-4 h-4 " + (uploadStatus === "uploading" || uploadStatus === "finalizing" ? "animate-spin" : "")} />
                    <span className="text-sm font-medium truncate">{getStatusMessage()}</span>
                  </div>
                </div>

                <Progress value={uploadProgress} className="h-2" />

                {!!statsText && <p className="text-xs text-muted-foreground">{statsText}</p>}
              </div>
            )}

            {/* Add to post options */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Add to your post</span>
                <div className="flex gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e, "image")}
                  />
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    ref={videoInputRef}
                    onChange={(e) => handleFileSelect(e, "video")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-green-500 hover:bg-green-500/10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                  >
                    <Image className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isBusy}
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-500 hover:bg-blue-500/10"
                    onClick={() => setShowTagFriends(true)}
                    disabled={isBusy}
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => setShowFeelings(true)}
                    disabled={isBusy}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-orange-500 hover:bg-orange-500/10"
                    onClick={() => setShowLocation(true)}
                    disabled={isBusy}
                  >
                    <MapPin className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Post button */}
            <Button onClick={handlePost} disabled={isBusy} className="w-full">
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FeelingSelector
        open={showFeelings}
        onOpenChange={setShowFeelings}
        onSelect={(f) => {
          setFeeling(f);
          setShowFeelings(false);
        }}
      />

      <LocationInput
        open={showLocation}
        onOpenChange={setShowLocation}
        onSelect={(l) => {
          setLocation(l);
          setShowLocation(false);
        }}
      />

      <TagFriendsDialog
        open={showTagFriends}
        onOpenChange={setShowTagFriends}
        userId={userId}
        selectedFriends={taggedFriends}
        onSelect={setTaggedFriends}
      />

      <PrivacySelector
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        selected={privacy}
        onSelect={(p) => {
          setPrivacy(p);
          setShowPrivacy(false);
        }}
      />
    </>
  );
};

export default CreatePostDialog;
