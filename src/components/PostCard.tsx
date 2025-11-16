import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    media_url: string | null;
    media_type: string | null;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      full_name: string | null;
    };
  };
  currentUserId: string;
}

const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLike = async () => {
    try {
      if (liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setLikesCount((prev) => prev - 1);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: currentUserId });
        setLikesCount((prev) => prev + 1);
        
        // Create notification
        if (post.profiles.id !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: post.profiles.id,
            from_user_id: currentUserId,
            type: "like",
            post_id: post.id,
          });
        }
      }
      setLiked(!liked);
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleShare = () => {
    toast({
      title: "Share",
      description: "Share functionality coming soon!",
    });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => navigate(`/profile/${post.profiles.id}`)}
        >
          <Avatar>
            <AvatarImage src={post.profiles.avatar_url || ""} />
            <AvatarFallback>{post.profiles.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{post.profiles.full_name || post.profiles.username}</p>
            <p className="text-sm text-muted-foreground">@{post.profiles.username}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {post.content && (
          <p className="px-6">{post.content}</p>
        )}
        {post.media_url && (
          <div className="w-full">
            {post.media_type === "image" ? (
              <img 
                src={post.media_url} 
                alt="Post content" 
                className="w-full object-cover max-h-96"
              />
            ) : (
              <video 
                src={post.media_url} 
                controls 
                className="w-full max-h-96"
              />
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-around pt-3">
        <Button
          variant="ghost"
          size="sm"
          className={liked ? "text-red-500" : ""}
          onClick={handleLike}
        >
          <Heart className={`w-5 h-5 mr-1 ${liked ? "fill-current" : ""}`} />
          {likesCount}
        </Button>
        <Button variant="ghost" size="sm">
          <MessageCircle className="w-5 h-5 mr-1" />
          Comment
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare}>
          <Share2 className="w-5 h-5 mr-1" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostCard;