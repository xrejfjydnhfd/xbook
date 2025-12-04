import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ReactionsBarProps {
  postId: string;
  userId: string;
  onReactionChange?: () => void;
}

type ReactionType = "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry";

const reactions: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: "like", emoji: "👍", label: "Like", color: "text-blue-500" },
  { type: "love", emoji: "❤️", label: "Love", color: "text-red-500" },
  { type: "care", emoji: "🤗", label: "Care", color: "text-yellow-500" },
  { type: "haha", emoji: "😂", label: "Haha", color: "text-yellow-500" },
  { type: "wow", emoji: "😮", label: "Wow", color: "text-yellow-500" },
  { type: "sad", emoji: "😢", label: "Sad", color: "text-yellow-500" },
  { type: "angry", emoji: "😠", label: "Angry", color: "text-orange-500" },
];

const ReactionsBar = ({ postId, userId, onReactionChange }: ReactionsBarProps) => {
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionType, number>>({
    like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [postId, userId]);

  const fetchReactions = async () => {
    // Get user's reaction
    const { data: userReactionData } = await supabase
      .from("reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (userReactionData) {
      setUserReaction(userReactionData.reaction as ReactionType);
    } else {
      setUserReaction(null);
    }

    // Get all reaction counts
    const { data: allReactions } = await supabase
      .from("reactions")
      .select("reaction")
      .eq("post_id", postId);

    if (allReactions) {
      const counts: Record<ReactionType, number> = {
        like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0
      };
      allReactions.forEach((r: any) => {
        if (r.reaction in counts) {
          counts[r.reaction as ReactionType]++;
        }
      });
      setReactionCounts(counts);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    setIsOpen(false);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    if (userReaction === type) {
      // Remove reaction
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      setUserReaction(null);
    } else if (userReaction) {
      // Update reaction
      await supabase
        .from("reactions")
        .update({ reaction: type })
        .eq("post_id", postId)
        .eq("user_id", userId);
      setUserReaction(type);
    } else {
      // Add reaction
      await supabase.from("reactions").insert({
        post_id: postId,
        user_id: userId,
        reaction: type
      });
      setUserReaction(type);
    }

    fetchReactions();
    onReactionChange?.();
  };

  const handleQuickReaction = () => {
    if (userReaction) {
      handleReaction(userReaction);
    } else {
      handleReaction("like");
    }
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topReactions = reactions
    .filter(r => reactionCounts[r.type] > 0)
    .sort((a, b) => reactionCounts[b.type] - reactionCounts[a.type])
    .slice(0, 3);

  const currentReaction = userReaction ? reactions.find(r => r.type === userReaction) : null;

  return (
    <div className="flex items-center gap-2">
      {/* Reaction summary */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            {topReactions.map((r) => (
              <span key={r.type} className="text-sm">{r.emoji}</span>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{totalReactions}</span>
        </div>
      )}

      {/* Reaction button with popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1",
              currentReaction?.color,
              isAnimating && "scale-125 transition-transform"
            )}
            onClick={(e) => {
              if (!isOpen) {
                e.preventDefault();
                handleQuickReaction();
              }
            }}
            onMouseEnter={() => setIsOpen(true)}
          >
            {currentReaction ? (
              <>
                <span className="text-lg">{currentReaction.emoji}</span>
                <span>{currentReaction.label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>Like</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          side="top"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex gap-1">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                className={cn(
                  "text-2xl hover:scale-125 transition-transform p-1 rounded",
                  userReaction === reaction.type && "bg-muted"
                )}
                onClick={() => handleReaction(reaction.type)}
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ReactionsBar;
