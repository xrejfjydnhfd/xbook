import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Image, Video, X, MapPin, Smile, UserPlus, Hash, Globe, Users, Lock, 
  ChevronDown, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FeelingSelector from "./FeelingSelector";
import LocationInput from "./LocationInput";
import TagFriendsDialog from "./TagFriendsDialog";
import PrivacySelector from "./PrivacySelector";
import MediaPreview from "./MediaPreview";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: { username: string; avatar_url: string | null; full_name: string | null } | null;
  onPostCreated: () => void;
}

type UploadStatus = "idle" | "uploading" | "processing" | "finalizing" | "complete" | "error";

const CreatePostDialog = ({ open, onOpenChange, userId, userProfile, onPostCreated }: CreatePostDialogProps) => {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
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
          setPreviews(prev => [...prev, canvas.toDataURL()]);
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
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
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  };

  const simulateProgress = (startFrom: number, target: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const steps = 20;
      const increment = (target - startFrom) / steps;
      const stepDuration = duration / steps;
      let current = startFrom;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
          setUploadProgress(target);
          clearInterval(interval);
          resolve();
        } else {
          setUploadProgress(Math.round(current));
        }
      }, stepDuration);
    });
  };

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      toast({ title: "Error", description: "Please add content or media", variant: "destructive" });
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let thumbnailUrl: string | null = null;
      let videoDuration: number | null = null;
      let isReel = false;

      if (files.length > 0) {
        const file = files[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        // Smooth progress from 0% to 60%
        const progressPromise = simulateProgress(0, 60, 2000);
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, file);

        await progressPromise;

        if (uploadError) throw uploadError;

        // Processing phase: 60% to 85%
        setUploadStatus("processing");
        await simulateProgress(60, 85, 1500);

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = file.type.startsWith("image") ? "image" : "video";

        // Check if video is a reel (< 60 seconds)
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
          thumbnailUrl = previews[0];
        }

        // Finalizing phase: 85% to 100%
        setUploadStatus("finalizing");
        await simulateProgress(85, 100, 1000);
      }

      // Extract hashtags from content
      const extractedHashtags = extractHashtags(content);

      // Create post
      const { data: postData, error: postError } = await supabase.from("posts").insert({
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
        processing_status: "completed"
      }).select().single();

      if (postError) throw postError;

      // Save hashtags
      if (extractedHashtags.length > 0 && postData) {
        for (const tag of extractedHashtags) {
          // Upsert hashtag
          const { data: hashtagData } = await supabase
            .from("hashtags")
            .upsert({ name: tag }, { onConflict: "name" })
            .select()
            .single();

          if (hashtagData) {
            await supabase.from("post_hashtags").insert({
              post_id: postData.id,
              hashtag_id: hashtagData.id
            });
          }
        }
      }

      // Save tagged friends
      if (taggedFriends.length > 0 && postData) {
        for (const friend of taggedFriends) {
          await supabase.from("post_tags").insert({
            post_id: postData.id,
            tagged_user_id: friend.id
          });

          // Notify tagged friend
          await supabase.from("notifications").insert({
            user_id: friend.id,
            from_user_id: userId,
            type: "tag",
            post_id: postData.id
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
      setUploadProgress(0);
      setUploadStatus("idle");
      
      onPostCreated();
      onOpenChange(false);

    } catch (error) {
      console.error("Error creating post:", error);
      setUploadStatus("error");
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case "uploading": return `Uploading... ${uploadProgress}%`;
      case "processing": return "Processing your video...";
      case "finalizing": return "Finalizing...";
      case "complete": return "Posted ✔";
      case "error": return "Upload failed";
      default: return "";
    }
  };

  const getPrivacyIcon = () => {
    switch (privacy) {
      case "public": return <Globe className="w-4 h-4" />;
      case "friends": return <Users className="w-4 h-4" />;
      case "only_me": return <Lock className="w-4 h-4" />;
    }
  };

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
                      {" "}with {taggedFriends.map(f => f.username).join(", ")}
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
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setLocation("")}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Media preview */}
            {previews.length > 0 && (
              <MediaPreview 
                previews={previews} 
                files={files} 
                onRemove={removeFile} 
              />
            )}

            {/* Upload progress */}
            {uploadStatus !== "idle" && uploadStatus !== "complete" && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">{getStatusMessage()}</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
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
                  >
                    <Image className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-blue-500 hover:bg-blue-500/10"
                    onClick={() => setShowTagFriends(true)}
                  >
                    <UserPlus className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => setShowFeelings(true)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-orange-500 hover:bg-orange-500/10"
                    onClick={() => setShowLocation(true)}
                  >
                    <MapPin className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Post button */}
            <Button
              onClick={handlePost}
              disabled={uploadStatus !== "idle" && uploadStatus !== "complete" && uploadStatus !== "error"}
              className="w-full"
            >
              {uploadStatus !== "idle" && uploadStatus !== "complete" && uploadStatus !== "error" ? (
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
        onSelect={(f) => { setFeeling(f); setShowFeelings(false); }}
      />
      
      <LocationInput
        open={showLocation}
        onOpenChange={setShowLocation}
        onSelect={(l) => { setLocation(l); setShowLocation(false); }}
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
        onSelect={(p) => { setPrivacy(p); setShowPrivacy(false); }}
      />
    </>
  );
};

export default CreatePostDialog;
