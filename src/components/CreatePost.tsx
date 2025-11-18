import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Image, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
  userId: string;
  onPostCreated: () => void;
}

const CreatePost = ({ userId, onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadProgress(0);
      
      if (selectedFile.type.startsWith("video")) {
        // Generate thumbnail for video
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
          setPreview(canvas.toDataURL());
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(selectedFile);
      } else {
        // Regular image preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    }
  };

  const handlePost = async () => {
    if (!content && !file) {
      toast({
        title: "Error",
        description: "Please add some content or media",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, file);

        clearInterval(progressInterval);
        setUploadProgress(95);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = file.type.startsWith("image") ? "image" : "video";
        
        setUploadProgress(100);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) throw error;

      setContent("");
      setFile(null);
      setPreview(null);
      setUploadProgress(0);
      onPostCreated();
      
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6 space-y-4">
        <Textarea
          id="create-post-content"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
        
        {preview && (
          <div className="relative space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80 z-10"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setUploadProgress(0);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="relative">
              <img src={preview} alt="Preview" className="rounded-lg w-full" />
              {file?.type.startsWith("video") && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
              )}
            </div>
            {loading && uploadProgress > 0 && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" size="sm" type="button" asChild>
                <span>
                  <Image className="w-4 h-4 mr-2" />
                  Photo
                </span>
              </Button>
            </label>
            <label>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline" size="sm" type="button" asChild>
                <span>
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </span>
              </Button>
            </label>
          </div>
          <Button
            onClick={handlePost}
            disabled={loading}
            className="bg-gradient-to-r from-primary to-accent"
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;