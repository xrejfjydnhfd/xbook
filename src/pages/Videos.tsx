import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "@/components/CommentsDialog";
import ShareDialog from "@/components/ShareDialog";

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoLikes, setVideoLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [touchStart, setTouchStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUserId && videos.length > 0) {
      fetchLikesForVideos();
    }
  }, [currentUserId, videos]);

  const fetchLikesForVideos = async () => {
    const likesData: Record<string, { liked: boolean; count: number }> = {};
    
    for (const video of videos) {
      const { data: likes } = await supabase
        .from("likes")
        .select("user_id")
        .eq("post_id", video.id);

      if (likes) {
        likesData[video.id] = {
          liked: likes.some((like: any) => like.user_id === currentUserId),
          count: likes.length,
        };
      }
    }
    
    setVideoLikes(likesData);
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchVideos();
  }, []);

  // Setup Intersection Observer for auto-play/pause
  useEffect(() => {
    if (videos.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0.75] }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observerRef.current?.observe(video);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [videos]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("media_type", "video")
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: userId,
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userId,
        from_user_id: currentUserId,
        type: "follow",
      });

      toast({
        title: "Following!",
        description: "You are now following this user",
      });
    } catch (error: any) {
      if (error.code === "23505") {
        toast({
          title: "Already following",
          description: "You are already following this user",
        });
      }
    }
  };

  const handleLike = async (videoId: string, postOwnerId: string) => {
    const currentLikeState = videoLikes[videoId];
    
    try {
      if (currentLikeState?.liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", videoId)
          .eq("user_id", currentUserId);
        
        setVideoLikes(prev => ({
          ...prev,
          [videoId]: { liked: false, count: (prev[videoId]?.count || 1) - 1 }
        }));
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: videoId, user_id: currentUserId });
        
        if (postOwnerId !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: postOwnerId,
            from_user_id: currentUserId,
            type: "like",
            post_id: videoId,
          });
        }
        
        setVideoLikes(prev => ({
          ...prev,
          [videoId]: { liked: true, count: (prev[videoId]?.count || 0) + 1 }
        }));
      }
    } catch (error) {
      console.error("Error liking video:", error);
    }
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      const container = containerRef.current;
      if (!container) return;

      const scrollAmount = window.innerHeight;
      if (diff > 0) {
        container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      }
    }
  }, [touchStart]);

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white text-lg">No videos yet</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {videos.map((video) => (
        <div 
          key={video.id}
          className="relative w-full h-screen snap-start snap-always flex items-center justify-center"
        >
          <video
            ref={(el) => {
              if (el) videoRefs.current[video.id] = el;
            }}
            src={video.media_url}
            className="w-full h-full object-contain"
            loop
            playsInline
            preload="metadata"
            onClick={(e) => {
              if (e.currentTarget.paused) {
                e.currentTarget.play();
              } else {
                e.currentTarget.pause();
              }
            }}
          />

          {/* User Info Overlay */}
          <div className="absolute bottom-20 left-4 right-20 text-white z-10">
            <div 
              className="flex items-center gap-3 mb-3 cursor-pointer"
              onClick={() => navigate(`/profile/${video.profiles.id}`)}
            >
              <Avatar className="border-2 border-white">
                <AvatarImage src={video.profiles.avatar_url || ""} />
                <AvatarFallback>{video.profiles.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{video.profiles.full_name || video.profiles.username}</p>
                <p className="text-sm opacity-80">@{video.profiles.username}</p>
              </div>
            </div>
            {video.content && (
              <p className="text-sm mb-2">{video.content}</p>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="absolute bottom-20 right-4 flex flex-col gap-6 items-center z-10">
            {video.profiles.id !== currentUserId && (
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full w-12 h-12"
                onClick={() => handleFollow(video.profiles.id)}
              >
                <UserPlus className="w-6 h-6" />
              </Button>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full w-12 h-12 flex flex-col"
              onClick={() => handleLike(video.id, video.profiles.id)}
            >
              <Heart 
                className={`w-7 h-7 ${videoLikes[video.id]?.liked ? "fill-red-500 text-red-500" : ""}`} 
              />
              <span className="text-xs mt-1">{videoLikes[video.id]?.count || 0}</span>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full w-12 h-12"
              onClick={() => {
                setSelectedVideo(video.id);
                setCommentsOpen(true);
              }}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full w-12 h-12"
              onClick={() => {
                setSelectedVideo(video.id);
                setShareOpen(true);
              }}
            >
              <Share2 className="w-6 h-6" />
            </Button>
          </div>
        </div>
      ))}

      {selectedVideo && (
        <>
          <CommentsDialog
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
            postId={selectedVideo}
            currentUserId={currentUserId}
          />
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            postId={selectedVideo}
          />
        </>
      )}
    </div>
  );
};

export default Videos;