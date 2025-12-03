import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, X } from "lucide-react";

interface CreateGroupPostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

const CreateGroupPost = ({ open, onOpenChange, currentUserId }: CreateGroupPostProps) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchJoinedGroups();
    }
  }, [open]);

  const fetchJoinedGroups = async () => {
    const { data } = await supabase
      .from("group_members")
      .select(`
        groups:group_id (*)
      `)
      .eq("user_id", currentUserId);

    if (data) {
      setGroups(data.map(m => m.groups).filter(Boolean));
    }
  };

  const handleMediaUpload = (type: "image" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : "video/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaFile) return;

    setLoading(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
      }

      const { error } = await supabase.from("posts").insert({
        user_id: currentUserId,
        content: content.trim(),
        media_url: mediaUrl,
        media_type: mediaType
      });

      if (error) throw error;

      toast({ title: "Post created!" });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ title: "Error creating post", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setSelectedGroup("");
    setMediaFile(null);
    setMediaPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Select a group to post in" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group: any) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={group.cover_image} />
                      <AvatarFallback>{group.name[0]}</AvatarFallback>
                    </Avatar>
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />

          {mediaPreview && (
            <div className="relative">
              {mediaFile?.type.startsWith("video") ? (
                <video src={mediaPreview} className="w-full rounded-lg" controls />
              ) : (
                <img src={mediaPreview} alt="" className="w-full rounded-lg" />
              )}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleMediaUpload("image")}>
              <Image className="w-4 h-4 mr-2" />
              Photo
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMediaUpload("video")}>
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>

          <Button
            onClick={handlePost}
            disabled={loading || (!content.trim() && !mediaFile)}
            className="w-full"
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupPost;
