import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image, Video, Smile } from "lucide-react";
import CreatePostDialog from "./post/CreatePostDialog";

interface CreatePostProps {
  userId: string;
  userProfile?: { username: string; avatar_url: string | null; full_name: string | null } | null;
  onPostCreated: () => void;
}

const CreatePost = ({ userId, userProfile, onPostCreated }: CreatePostProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={userProfile?.avatar_url || ""} />
          <AvatarFallback>{userProfile?.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <Button
          variant="secondary"
          className="flex-1 justify-start text-muted-foreground font-normal rounded-full h-10"
          onClick={() => setDialogOpen(true)}
        >
          What's on your mind?
        </Button>
      </div>

      <div className="flex items-center justify-around mt-3 pt-3 border-t">
        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-red-500"
          onClick={() => setDialogOpen(true)}
        >
          <Video className="w-5 h-5" />
          <span className="text-sm">Live video</span>
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-green-500"
          onClick={() => setDialogOpen(true)}
        >
          <Image className="w-5 h-5" />
          <span className="text-sm">Photo/video</span>
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-yellow-500"
          onClick={() => setDialogOpen(true)}
        >
          <Smile className="w-5 h-5" />
          <span className="text-sm">Feeling</span>
        </Button>
      </div>

      <CreatePostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        userProfile={userProfile || null}
        onPostCreated={onPostCreated}
      />
    </>
  );
};

export default CreatePost;
