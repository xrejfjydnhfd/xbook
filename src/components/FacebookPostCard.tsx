import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, ThumbsUp, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";
import ShareDialog from "./ShareDialog";
import { formatDistanceToNow } from "date-fns";

interface FacebookPostCardProps {
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

const FacebookPostCard = ({ post, currentUserId }: FacebookPostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLikeStatus();
    fetchCommentsCount();
  }, [post.id, currentUserId]);

  const fetchLikeStatus = async () => {
    const { data: likes } = await supabase
      .from("likes")
      .select("id, user_id")
      .eq("post_id", post.id);

    if (likes) {
      setLikesCount(likes.length);
      const userLike = likes.find((like: any) => like.user_id === currentUserId);
      setLiked(!!userLike);
    }
  };

  const fetchCommentsCount = async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    if (count !== null) {
      setCommentsCount(count);
    }
  };

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

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) {
        handleLike();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    setLastTap(now);
  };

  return (
    <Card className="mb-3 overflow-hidden border-0 shadow-sm bg-card rounded-none sm:rounded-xl">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/profile/${post.profiles.id}`)}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profiles.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.profiles.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm">{post.profiles.full_name || post.profiles.username}</p>
              <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: false })}</span>
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Post Content */}
      {post.content && (
        <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Post Media */}
      {post.media_url && (
        <div className="relative" onClick={handleDoubleTap}>
          {post.media_type === "image" ? (
            <img 
              src={post.media_url} 
              alt="Post content" 
              className="w-full object-cover max-h-[500px]"
            />
          ) : (
            <video 
              src={post.media_url} 
              controls 
              className="w-full max-h-[500px]"
              playsInline
            />
          )}
          
          {/* Double tap heart animation */}
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart 
                className="w-24 h-24 text-white fill-white animate-[scale-in_0.3s_ease-out,fade-out_0.5s_ease-out_0.5s]" 
                style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Like/Comment Count */}
      {(likesCount > 0 || commentsCount > 0) && (
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {likesCount > 0 && (
              <>
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <ThumbsUp className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>{likesCount}</span>
              </>
            )}
          </div>
          {commentsCount > 0 && (
            <span>{commentsCount} comments</span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center border-t border-border">
        <Button
          variant="ghost"
          className={`flex-1 h-11 gap-2 rounded-none ${liked ? "text-primary" : "text-muted-foreground"}`}
          onClick={handleLike}
        >
          <ThumbsUp className={`w-5 h-5 ${liked ? "fill-primary" : ""}`} />
          <span className="text-sm font-medium">Like</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 h-11 gap-2 rounded-none text-muted-foreground"
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Comment</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 h-11 gap-2 rounded-none text-muted-foreground"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Share</span>
        </Button>
      </div>

      <CommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        postId={post.id}
        currentUserId={currentUserId}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postId={post.id}
      />
    </Card>
  );
};

export default FacebookPostCard;
