import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreHorizontal,
  ThumbsUp,
  Laugh,
  Frown,
  Angry,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id?: string;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reactions?: {
    type: string;
    count: number;
    userReacted: boolean;
  }[];
  replies?: Comment[];
}

interface VideoCommentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentUserId: string | null;
}

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, color: 'text-blue-500' },
  { type: 'love', icon: Heart, color: 'text-red-500' },
  { type: 'haha', icon: Laugh, color: 'text-yellow-500' },
  { type: 'sad', icon: Frown, color: 'text-yellow-600' },
  { type: 'angry', icon: Angry, color: 'text-orange-500' },
];

const VideoComments = ({ open, onOpenChange, postId, currentUserId }: VideoCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && postId) {
      fetchComments();
    }
  }, [open, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Organize comments into parent-reply structure
      const parentComments: Comment[] = [];
      const repliesMap: Record<string, Comment[]> = {};

      (data || []).forEach((comment: Comment) => {
        const parentId = (comment as any).parent_id;
        if (parentId) {
          if (!repliesMap[parentId]) repliesMap[parentId] = [];
          repliesMap[parentId].push(comment);
        } else {
          parentComments.push(comment);
        }
      });

      // Attach replies to parent comments
      const commentsWithReplies = parentComments.map(comment => ({
        ...comment,
        replies: repliesMap[comment.id] || [],
      }));

      setComments(commentsWithReplies);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId) return;

    try {
      const commentData: any = {
        content: newComment.trim(),
        post_id: postId,
        user_id: currentUserId,
      };

      if (replyTo) {
        commentData.parent_id = replyTo.id;
      }

      const { error } = await supabase.from("comments").insert(commentData);

      if (error) throw error;

      setNewComment("");
      setReplyTo(null);
      fetchComments();
      toast.success(replyTo ? "Reply added" : "Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`flex gap-2 ${isReply ? "ml-10 mt-2" : "mb-4"}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.profiles?.avatar_url || ""} />
        <AvatarFallback className="text-xs">
          {comment.profiles?.full_name?.[0] || comment.profiles?.username?.[0] || "U"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded-2xl px-3 py-2">
          <p className="font-semibold text-xs">
            {comment.profiles?.full_name || comment.profiles?.username}
          </p>
          <p className="text-sm">{comment.content}</p>
        </div>
        
        <div className="flex items-center gap-3 mt-1 px-3">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          <button className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Like
          </button>
          {!isReply && (
            <button
              onClick={() => setReplyTo({ id: comment.id, username: comment.profiles?.username || "" })}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
        </div>

        {/* Show replies toggle */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => toggleReplies(comment.id)}
            className="flex items-center gap-1 mt-2 ml-3 text-xs font-semibold text-primary"
          >
            {expandedReplies.has(comment.id) ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide {comment.replies.length} replies
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                View {comment.replies.length} replies
              </>
            )}
          </button>
        )}

        {/* Replies */}
        {!isReply && expandedReplies.has(comment.id) && comment.replies?.map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="border-b pb-3">
          <SheetTitle className="text-center">Comments</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100%-120px)] py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </ScrollArea>

        {/* Reply indicator */}
        {replyTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg">
            <span className="text-sm text-muted-foreground">
              Replying to <span className="font-semibold">@{replyTo.username}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Comment input */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <Avatar className="w-8 h-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <Input
            placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 rounded-full"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!newComment.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VideoComments;
