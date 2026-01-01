import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, UserPlus, Bookmark, Volume2, VolumeX, ArrowLeft, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "@/components/CommentsDialog";
import ShareDialog from "@/components/ShareDialog";
import { FloatingMiniPlayer } from "@/components/video/FloatingMiniPlayer";
import { useVideoPreload } from "@/hooks/useVideoPreload";
import { useVideoCache } from "@/hooks/useVideoCache";

const MAX_VIDEO_DURATION = 90; // 1 minute 30 seconds

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoLikes, setVideoLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState(0);
  const [showHeart, setShowHeart] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState(0);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [commentsCount, setCommentsCount] = useState<Record<string, number>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState<any | null>(null);
  const [miniPlayerTime, setMiniPlayerTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Video preloading and caching hooks
  const { preloadVideos, getPreloadedUrl, isPreloaded } = useVideoPreload();
  const { savePlaybackPosition, getPlaybackPosition, recordView } = useVideoCache();

  useEffect(() => {
    if (currentUserId && videos.length > 0) {
      fetchLikesForVideos();
      fetchCommentsCount();
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

  const fetchCommentsCount = async () => {
    const counts: Record<string, number> = {};
    for (const video of videos) {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", video.id);
      counts[video.id] = count || 0;
    }
    setCommentsCount(counts);
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchVideos();
  }, []);

  // Preload videos when list changes
  useEffect(() => {
    if (videos.length > 0) {
      const videoUrls = videos
        .filter((v) => v.media_url)
        .map((v) => v.media_url);
      
      const currentIndex = activeVideoId 
        ? videos.findIndex((v) => v.id === activeVideoId) 
        : 0;
      
      preloadVideos(videoUrls, currentIndex);
    }
  }, [videos, activeVideoId, preloadVideos]);

  useEffect(() => {
    if (videos.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const videoId = video.dataset.videoId;
          
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
            video.play().catch(() => {});
            if (videoId) {
              setActiveVideoId(videoId);
              setMiniPlayerVideo(null);
            }
          } else {
            video.pause();
            // Show mini player when scrolling away from active video
            if (videoId && activeVideoId === videoId && entry.intersectionRatio < 0.3) {
              const videoData = videos.find((v) => v.id === videoId);
              if (videoData) {
                setMiniPlayerTime(video.currentTime);
                setMiniPlayerVideo(videoData);
              }
            }
          }
        });
      },
      { threshold: [0.3, 0.75] }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observerRef.current?.observe(video);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [videos, activeVideoId]);

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

  const handleSave = (videoId: string) => {
    setSavedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
        toast({ title: "Removed from saved" });
      } else {
        newSet.add(videoId);
        toast({ title: "Saved!" });
      }
      return newSet;
    });
  };

  const toggleMute = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      video.muted = !video.muted;
      setMutedVideos(prev => {
        const newSet = new Set(prev);
        if (video.muted) {
          newSet.add(videoId);
        } else {
          newSet.delete(videoId);
        }
        return newSet;
      });
    }
  };

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

  const handleDoubleTap = useCallback((videoId: string, postOwnerId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (!videoLikes[videoId]?.liked) {
        handleLike(videoId, postOwnerId);
      }
      setShowHeart(videoId);
      setTimeout(() => setShowHeart(null), 1000);
    }
    setLastTap(now);
  }, [lastTap, videoLikes, handleLike]);

  const handleVideoTimeUpdate = (videoId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.currentTime >= MAX_VIDEO_DURATION) {
      video.currentTime = 0;
      video.pause();
    }
    
    // Save playback position for resume-where-left functionality
    const videoData = videos.find((v) => v.id === videoId);
    if (videoData?.media_url) {
      savePlaybackPosition(videoData.media_url, video.currentTime, video.duration);
    }
  };

  const handleVideoEnded = (videoId: string) => {
    const videoData = videos.find((v) => v.id === videoId);
    if (videoData?.media_url) {
      recordView(videoData.media_url, videoData.video_duration || 0);
    }
  };

  const getInitialTime = (mediaUrl: string | null) => {
    if (!mediaUrl) return 0;
    return getPlaybackPosition(mediaUrl);
  };

  const closeMiniPlayer = () => {
    setMiniPlayerVideo(null);
  };

  const scrollToVideo = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setMiniPlayerVideo(null);
    }
  };

  const truncateCaption = (text: string | null, videoId: string) => {
    if (!text) return null;
    const isExpanded = expandedCaptions.has(videoId);
    if (isExpanded || text.length <= 80) return text;
    return text.slice(0, 80) + "...";
  };

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

      {/* Back Button */}
      <Button
        size="icon"
        variant="ghost"
        className="fixed top-4 left-4 z-50 text-white bg-black/30 backdrop-blur-sm rounded-full"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-6 h-6" />
      </Button>

      {/* Reels Label */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <span className="text-white font-bold text-lg">Reels</span>
      </div>

      {videos.map((video, index) => (
        <div 
          key={video.id}
          className="relative w-full h-screen snap-start snap-always flex items-center justify-center"
        >
          <video
            ref={(el) => {
              if (el) {
                videoRefs.current[video.id] = el;
                // Set initial time from cache for resume functionality
                const initialTime = getInitialTime(video.media_url);
                if (initialTime > 0 && el.currentTime === 0) {
                  el.currentTime = initialTime;
                }
              }
            }}
            data-video-id={video.id}
            src={video.media_url ? getPreloadedUrl(video.media_url) : video.media_url}
            className="w-full h-full object-cover"
            loop
            playsInline
            muted={mutedVideos.has(video.id)}
            preload="metadata"
            onTimeUpdate={(e) => handleVideoTimeUpdate(video.id, e)}
            onEnded={() => handleVideoEnded(video.id)}
            onClick={(e) => {
              handleDoubleTap(video.id, video.profiles.id);
              if (e.currentTarget.paused) {
                e.currentTarget.play();
              } else {
                e.currentTarget.pause();
              }
            }}
          />

          {/* Preload indicator */}
          {video.media_url && isPreloaded(video.media_url) && (
            <div className="absolute top-16 left-4 z-30 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
              ⚡ Preloaded
            </div>
          )}

          {/* Double Tap Heart Animation */}
          {showHeart === video.id && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Heart 
                className="w-32 h-32 text-white fill-white animate-[scale-in_0.3s_ease-out,fade-out_0.5s_ease-out_0.5s]" 
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))',
                }}
              />
            </div>
          )}

          {/* Sound Toggle - Top Right */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-16 right-4 z-30 bg-black/30 backdrop-blur-sm text-white rounded-full w-10 h-10"
            onClick={() => toggleMute(video.id)}
          >
            {mutedVideos.has(video.id) ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          {/* User Info Overlay - Bottom Left */}
          <div className="absolute bottom-24 left-4 right-20 text-white z-10">
            <div 
              className="flex items-center gap-3 mb-3 cursor-pointer"
              onClick={() => navigate(`/profile/${video.profiles.id}`)}
            >
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarImage src={video.profiles.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {video.profiles.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="font-bold">{video.profiles.username}</span>
                <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
                {video.profiles.id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 border-white text-white bg-transparent hover:bg-white/20 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(video.profiles.id);
                    }}
                  >
                    Follow
                  </Button>
                )}
              </div>
            </div>
            {video.content && (
              <p 
                className="text-sm leading-relaxed cursor-pointer"
                onClick={() => {
                  setExpandedCaptions(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(video.id)) {
                      newSet.delete(video.id);
                    } else {
                      newSet.add(video.id);
                    }
                    return newSet;
                  });
                }}
              >
                {truncateCaption(video.content, video.id)}
                {video.content && video.content.length > 80 && !expandedCaptions.has(video.id) && (
                  <span className="font-semibold ml-1">more</span>
                )}
              </p>
            )}
          </div>

          {/* Right Side Actions - Facebook Reels Style */}
          <div className="absolute bottom-24 right-3 flex flex-col gap-5 items-center z-10">
            {/* Like */}
            <div className="flex flex-col items-center">
              <Button
                size="icon"
                variant="ghost"
                className="text-white rounded-full w-12 h-12 bg-black/20"
                onClick={() => handleLike(video.id, video.profiles.id)}
              >
                <Heart 
                  className={`w-7 h-7 ${videoLikes[video.id]?.liked ? "fill-red-500 text-red-500" : ""}`} 
                />
              </Button>
              <span className="text-white text-xs font-semibold mt-1">
                {videoLikes[video.id]?.count || 0}
              </span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center">
              <Button
                size="icon"
                variant="ghost"
                className="text-white rounded-full w-12 h-12 bg-black/20"
                onClick={() => {
                  setSelectedVideo(video.id);
                  setCommentsOpen(true);
                }}
              >
                <MessageCircle className="w-7 h-7" />
              </Button>
              <span className="text-white text-xs font-semibold mt-1">
                {commentsCount[video.id] || 0}
              </span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center">
              <Button
                size="icon"
                variant="ghost"
                className="text-white rounded-full w-12 h-12 bg-black/20"
                onClick={() => {
                  setSelectedVideo(video.id);
                  setShareOpen(true);
                }}
              >
                <Share2 className="w-7 h-7" />
              </Button>
              <span className="text-white text-xs font-semibold mt-1">Share</span>
            </div>

            {/* Save */}
            <div className="flex flex-col items-center">
              <Button
                size="icon"
                variant="ghost"
                className="text-white rounded-full w-12 h-12 bg-black/20"
                onClick={() => handleSave(video.id)}
              >
                <Bookmark 
                  className={`w-7 h-7 ${savedVideos.has(video.id) ? "fill-white" : ""}`} 
                />
              </Button>
              <span className="text-white text-xs font-semibold mt-1">Save</span>
            </div>

            {/* Profile Avatar */}
            <div 
              className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white cursor-pointer mt-2"
              onClick={() => navigate(`/profile/${video.profiles.id}`)}
            >
              <img 
                src={video.profiles.avatar_url || "/placeholder.svg"} 
                alt={video.profiles.username}
                className="w-full h-full object-cover"
              />
            </div>
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

      {/* Floating Mini Player */}
      {miniPlayerVideo && miniPlayerVideo.media_url && (
        <FloatingMiniPlayer
          videoUrl={getPreloadedUrl(miniPlayerVideo.media_url)}
          thumbnailUrl={miniPlayerVideo.thumbnail_url || undefined}
          title={miniPlayerVideo.content || 'Video'}
          author={miniPlayerVideo.profiles?.full_name || miniPlayerVideo.profiles?.username || 'Unknown'}
          currentTime={miniPlayerTime}
          onClose={closeMiniPlayer}
          onExpand={() => scrollToVideo(miniPlayerVideo.id)}
        />
      )}
    </div>
  );
};

export default Videos;
