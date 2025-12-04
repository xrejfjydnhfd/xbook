import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, BadgeCheck, MapPin, Bookmark, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "./CommentsDialog";
import ShareDialog from "./ShareDialog";
import { formatDistanceToNow } from "date-fns";
import ReactionsBar from "./post/ReactionsBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface FacebookPostCardProps {
  post: {
    id: string;
    content: string | null;
    media_url: string | null;
    media_type: string | null;
    created_at: string;
    feeling?: string | null;
    location?: string | null;
    privacy?: string | null;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      full_name: string | null;
    };
  };
  currentUserId: string;
  onPostDeleted?: () => void;
}

const FacebookPostCard = ({ post, currentUserId, onPostDeleted }: FacebookPostCardProps) => {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCommentsCount();
    checkSavedStatus();
  }, [post.id, currentUserId]);

  const fetchCommentsCount = async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    if (count !== null) {
      setCommentsCount(count);
    }
  };

  const checkSavedStatus = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    
    if (isSaved) {
      await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);
      setIsSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      await supabase.from("saved_posts").insert({
        post_id: post.id,
        user_id: currentUserId
      });
      setIsSaved(true);
      toast({ title: "Saved to your collection" });
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", currentUserId);
    
    if (!error) {
      toast({ title: "Post deleted" });
      onPostDeleted?.();
    }
  };

  const handleDoubleTap = async () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Quick like via reactions table
      const { data: existingReaction } = await supabase
        .from("reactions")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!existingReaction) {
        await supabase.from("reactions").insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction: "like"
        });
      }
      
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    setLastTap(now);
  };

  const getPrivacyIcon = () => {
    switch (post.privacy) {
      case "friends": return <Users className="w-3 h-3" />;
      case "only_me": return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  const isOwner = currentUserId === post.profiles.id;

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
            <div className="flex items-center gap-1 flex-wrap">
              <p className="font-semibold text-sm">{post.profiles.full_name || post.profiles.username}</p>
              <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
              {post.feeling && (
                <span className="text-sm text-muted-foreground">
                  is {post.feeling}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: false })}</span>
              <span>·</span>
              {getPrivacyIcon()}
              {post.location && (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSave}>
              <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Unsave post" : "Save post"}
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                Delete post
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem>Report post</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Reactions and Comments Count */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <ReactionsBar postId={post.id} userId={currentUserId} />
          {commentsCount > 0 && (
            <button 
              className="hover:underline"
              onClick={() => setCommentsOpen(true)}
            >
              {commentsCount} comments
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center border-t border-border">
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
