import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
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
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = file.type.startsWith("image") ? "image" : "video";
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
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            {file?.type.startsWith("image") ? (
              <img src={preview} alt="Preview" className="rounded-lg w-full" />
            ) : (
              <video src={preview} controls className="rounded-lg w-full" />
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