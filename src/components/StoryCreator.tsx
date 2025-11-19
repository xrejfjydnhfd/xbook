import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Canvas as FabricCanvas, PencilBrush, Text } from "fabric";
import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  Smile, 
  Palette, 
  Users, 
  X,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

interface StoryCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onStoryCreated: () => void;
}

const STICKERS = ["😀", "😍", "🎉", "❤️", "🔥", "⭐", "👍", "🎵", "📸", "💯", "✨", "🌟"];
const MUSIC_TRACKS = [
  { id: "1", name: "Happy Vibes", url: "/music/happy.mp3" },
  { id: "2", name: "Chill Beats", url: "/music/chill.mp3" },
  { id: "3", name: "Party Time", url: "/music/party.mp3" },
  { id: "4", name: "Relaxing", url: "/music/relax.mp3" },
];

export const StoryCreator = ({ open, onOpenChange, userId, onStoryCreated }: StoryCreatorProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  useEffect(() => {
    if (preview && canvasRef.current && !canvas) {
      const fabricCanvas = new FabricCanvas(canvasRef.current, {
        width: 400,
        height: 600,
        backgroundColor: "#000000",
      });

      const brush = new PencilBrush(fabricCanvas);
      brush.color = "#ffffff";
      brush.width = 3;
      fabricCanvas.freeDrawingBrush = brush;

      setCanvas(fabricCanvas);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [preview, canvas]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select(`
        friend_id,
        profiles!friendships_friend_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (data) {
      setFriends(data.map(f => f.profiles));
    }
  };

  const handleFileSelect = (type: "image" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : "video/*";
    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setMediaType(type);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
          setActiveTab("edit");
        };
        reader.readAsDataURL(selectedFile);
      }
    };
    input.click();
  };

  const handleAddSticker = (sticker: string) => {
    if (!canvas) return;
    
    const text = new Text(sticker, {
      left: 200,
      top: 300,
      fontSize: 60,
      fill: "#ffffff",
    });
    canvas.add(text);
  };

  const handleDrawToggle = () => {
    if (!canvas) return;
    canvas.isDrawingMode = !canvas.isDrawingMode;
  };

  const handleColorChange = (color: string) => {
    if (!canvas?.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = color;
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handlePost = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a photo or video",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upload media
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/stories/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      // Create story
      const { error } = await supabase.from("stories").insert({
        user_id: userId,
        media_url: publicUrl,
        media_type: mediaType,
      });

      if (error) throw error;

      // Create notifications for tagged friends
      if (selectedFriends.length > 0) {
        const notifications = selectedFriends.map(friendId => ({
          user_id: friendId,
          from_user_id: userId,
          type: "story_tag",
        }));
        
        await supabase.from("notifications").insert(notifications);
      }

      toast({
        title: "Success",
        description: "Story posted successfully!",
      });
      
      onStoryCreated();
      handleClose();
    } catch (error) {
      console.error("Error posting story:", error);
      toast({
        title: "Error",
        description: "Failed to post story",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setSelectedMusic(null);
    setSelectedFriends([]);
    setActiveTab("upload");
    if (canvas) {
      canvas.dispose();
      setCanvas(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Your Story</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="edit" disabled={!preview}>Edit</TabsTrigger>
            <TabsTrigger value="music" disabled={!preview}>Music</TabsTrigger>
            <TabsTrigger value="stickers" disabled={!preview}>Stickers</TabsTrigger>
            <TabsTrigger value="tag" disabled={!preview}>Tag</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Button
                size="lg"
                onClick={() => handleFileSelect("image")}
                className="w-64"
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Select Photo
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => handleFileSelect("video")}
                className="w-64"
              >
                <Video className="w-5 h-5 mr-2" />
                Select Video
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="flex-1">
            <div className="flex gap-4 h-full">
              <div className="flex-1 flex items-center justify-center bg-muted rounded-lg">
                {preview && (
                  <div className="relative">
                    {mediaType === "image" ? (
                      <img src={preview} alt="Preview" className="max-h-[500px] rounded-lg" />
                    ) : (
                      <video src={preview} controls className="max-h-[500px] rounded-lg" />
                    )}
                    <canvas ref={canvasRef} className="absolute top-0 left-0" />
                  </div>
                )}
              </div>
              <div className="w-48 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Draw</p>
                  <Button onClick={handleDrawToggle} variant="outline" className="w-full">
                    <Palette className="w-4 h-4 mr-2" />
                    Toggle Draw
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Colors</p>
                  <div className="grid grid-cols-4 gap-2">
                    {["#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#000000"].map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className="w-8 h-8 rounded-full border-2 border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="music" className="flex-1">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {MUSIC_TRACKS.map(track => (
                  <div
                    key={track.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedMusic === track.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedMusic(track.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5" />
                      <span>{track.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stickers" className="flex-1">
            <div className="grid grid-cols-6 gap-4 p-4">
              {STICKERS.map((sticker, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddSticker(sticker)}
                  className="text-4xl hover:scale-110 transition-transform"
                >
                  {sticker}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tag" className="flex-1">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleFriend(friend.id)}
                  >
                    <Checkbox
                      checked={selectedFriends.includes(friend.id)}
                      onCheckedChange={() => handleToggleFriend(friend.id)}
                    />
                    <Avatar>
                      <AvatarImage src={friend.avatar_url || ""} />
                      <AvatarFallback>{friend.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.full_name || friend.username}</p>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={loading || !file}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Posting..." : "Post Story"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
