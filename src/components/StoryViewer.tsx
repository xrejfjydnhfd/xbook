import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { X, Send, MoreHorizontal, BadgeCheck, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Story {
  id: string;
  media_url: string;
  media_type: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

const REACTIONS = ["❤️", "👍", "😆", "😮", "😢", "😡"];

const StoryViewer = ({ stories, initialIndex, open, onOpenChange, currentUserId }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!open || isPaused) return;

    const isVideo = currentStory?.media_type === "video";
    
    if (isVideo && videoRef.current) {
      videoRef.current.play();
      return;
    }

    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, open, isPaused]);

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPrevious();
    } else if (x > (width * 2) / 3) {
      goToNext();
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  const handleVideoEnded = () => {
    goToNext();
  };

  const handleReaction = (reaction: string) => {
    console.log("Reaction:", reaction);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Message sent:", message);
      setMessage("");
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-[100dvh] p-0 bg-black border-0 rounded-none sm:rounded-xl overflow-hidden">
        <div className="relative w-full h-full flex flex-col" onClick={handleTap}>
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 bg-gradient-to-b from-black/50 to-transparent">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ 
                    width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%" 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-primary">
                <AvatarImage src={currentStory.profiles.avatar_url || ""} />
                <AvatarFallback>{currentStory.profiles.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-white">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">{currentStory.profiles.username}</span>
                  <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
                </div>
                <span className="text-xs text-white/70">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: false })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              {currentStory.media_type === "video" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Story Content */}
          <div className="flex-1 flex items-center justify-center">
            {currentStory.media_type === "video" ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                muted={isMuted}
                playsInline
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : (
              <img 
                src={currentStory.media_url} 
                alt="Story" 
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 pt-16">
            {/* Quick Reactions */}
            <div className="flex justify-center gap-4 mb-4" onClick={(e) => e.stopPropagation()}>
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95"
                  onClick={() => handleReaction(reaction)}
                >
                  {reaction}
                </button>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send message..."
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full"
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleSendMessage}
                disabled={!message.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;
