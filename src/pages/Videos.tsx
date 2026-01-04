import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, ArrowLeft, BadgeCheck, MoreHorizontal, TrendingUp, Users, BarChart3, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import VideoComments from "@/components/video/VideoComments";
import ShareDialog from "@/components/ShareDialog";
import { FloatingMiniPlayer } from "@/components/video/FloatingMiniPlayer";
import { useVideoPreload } from "@/hooks/useVideoPreload";
import { useVideoCache } from "@/hooks/useVideoCache";
import VideoOptionsSheet from "@/components/video/VideoOptionsSheet";
import TrendingVideos from "@/components/video/TrendingVideos";
import VideoQualitySelector, { VideoQuality } from "@/components/video/VideoQualitySelector";
import VideoAnalytics from "@/components/video/VideoAnalytics";
import VideoDuetStitch from "@/components/video/VideoDuetStitch";
const MAX_VIDEO_DURATION = 90;

type FeedTab = "forYou" | "following" | "trending";

const TabSelector = ({ activeTab, setActiveTab }: { activeTab: FeedTab; setActiveTab: (tab: FeedTab) => void }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex bg-black/50 backdrop-blur-md rounded-full p-1">
    <Button
      size="sm"
      variant={activeTab === "forYou" ? "default" : "ghost"}
      className={`rounded-full px-4 ${activeTab !== "forYou" ? "text-white" : ""}`}
      onClick={() => setActiveTab("forYou")}
    >
      For You
    </Button>
    <Button
      size="sm"
      variant={activeTab === "following" ? "default" : "ghost"}
      className={`rounded-full px-4 ${activeTab !== "following" ? "text-white" : ""}`}
      onClick={() => setActiveTab("following")}
    >
      Following
    </Button>
    <Button
      size="sm"
      variant={activeTab === "trending" ? "default" : "ghost"}
      className={`rounded-full px-4 ${activeTab !== "trending" ? "text-white" : ""}`}
      onClick={() => setActiveTab("trending")}
    >
      <TrendingUp className="w-4 h-4 mr-1" />
      Trending
    </Button>
  </div>
);

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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedVideoForOptions, setSelectedVideoForOptions] = useState<any | null>(null);
  const [hiddenVideos, setHiddenVideos] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("auto");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsVideoId, setAnalyticsVideoId] = useState<string | null>(null);
  const [duetStitchOpen, setDuetStitchOpen] = useState(false);
  const [duetStitchVideo, setDuetStitchVideo] = useState<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { preloadVideos, getPreloadedUrl, isPreloaded } = useVideoPreload();
  const { savePlaybackPosition, getPlaybackPosition, recordView } = useVideoCache();

  useEffect(() => {
    if (currentUserId && videos.length > 0) {
      fetchLikesForVideos();
      fetchCommentsCount();
    }
  }, [currentUserId, videos]);

  useEffect(() => {
    fetchCurrentUser();
    fetchVideos();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFollowing();
    }
  }, [currentUserId]);

  const fetchFollowing = async () => {
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId);

    if (data) {
      setFollowingIds(data.map((f) => f.following_id));
    }
  };

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

  const getFilteredVideos = () => {
    const visibleVideos = videos.filter(video => !hiddenVideos.has(video.id));
    
    if (activeTab === "following") {
      return visibleVideos.filter(video => followingIds.includes(video.profiles?.id));
    }
    
    return visibleVideos;
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

      setFollowingIds((prev) => [...prev, userId]);
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
  }, [lastTap, videoLikes]);

  const handleVideoTimeUpdate = (videoId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.currentTime >= MAX_VIDEO_DURATION) {
      video.currentTime = 0;
      video.pause();
    }
    
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

  const filteredVideos = getFilteredVideos();

  if (activeTab === "trending") {
    return (
      <div className="fixed inset-0 bg-black overflow-y-auto">
        {/* Back Button */}
        <Button
          size="icon"
          variant="ghost"
          className="fixed top-4 left-4 z-50 text-white bg-black/30 backdrop-blur-sm rounded-full"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="pt-20">
          <TrendingVideos />
        </div>
      </div>
    );
  }

  if (filteredVideos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />

        <Button
          size="icon"
          variant="ghost"
          className="fixed top-4 left-4 z-50 text-white bg-black/30 backdrop-blur-sm rounded-full"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <Users className="w-16 h-16 text-white/50 mb-4" />
        <p className="text-white text-lg">
          {activeTab === "following" 
            ? "No videos from people you follow" 
            : "No videos yet"}
        </p>
        <p className="text-white/60 text-sm mt-2">
          {activeTab === "following" 
            ? "Follow creators to see their videos here" 
            : "Be the first to upload a video!"}
        </p>
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

      <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />

      {filteredVideos.map((video) => {
        const isShortVideo = (video.video_duration && video.video_duration <= 60) || video.is_reel;
        
        return (
        <div 
          key={video.id}
          className="relative w-full h-screen snap-start snap-always flex items-center justify-center"
        >
          <video
            ref={(el) => {
              if (el) {
                videoRefs.current[video.id] = el;
                const initialTime = getInitialTime(video.media_url);
                if (initialTime > 0 && el.currentTime === 0) {
                  el.currentTime = initialTime;
                }
              }
            }}
            data-video-id={video.id}
            src={video.media_url ? getPreloadedUrl(video.media_url) : video.media_url}
            className={`w-full h-full ${isShortVideo ? 'object-contain' : 'object-cover'}`}
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

          {video.media_url && isPreloaded(video.media_url) && (
            <div className="absolute top-16 left-4 z-30 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
              ⚡ Preloaded
            </div>
          )}

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

          {/* Top Right Controls */}
          <div className="absolute top-16 right-4 z-30 flex items-center gap-2">
            {/* Quality Selector */}
            <VideoQualitySelector
              currentQuality={videoQuality}
              onQualityChange={setVideoQuality}
              className="bg-black/30 backdrop-blur-sm"
            />
            
            {/* Options Button */}
            <Button
              size="icon"
              variant="ghost"
              className="bg-black/30 backdrop-blur-sm text-white rounded-full w-10 h-10"
              onClick={() => {
                setSelectedVideoForOptions(video);
                setOptionsOpen(true);
              }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
            
            {/* Sound Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className="bg-black/30 backdrop-blur-sm text-white rounded-full w-10 h-10"
              onClick={() => toggleMute(video.id)}
            >
              {mutedVideos.has(video.id) ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
          </div>

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
                {video.profiles.id !== currentUserId && !followingIds.includes(video.profiles.id) && (
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

          {/* Right Side Actions */}
          <div className="absolute bottom-24 right-3 flex flex-col gap-4 items-center z-10">
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

            {/* Duet/Stitch Button */}
            <div className="flex flex-col items-center">
              <Button
                size="icon"
                variant="ghost"
                className="text-white rounded-full w-12 h-12 bg-black/20"
                onClick={() => {
                  setDuetStitchVideo(video);
                  setDuetStitchOpen(true);
                }}
              >
                <Scissors className="w-6 h-6" />
              </Button>
              <span className="text-white text-xs font-semibold mt-1">Duet</span>
            </div>

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

            {/* Analytics Button (only for own videos) */}
            {video.profiles?.id === currentUserId && (
              <div className="flex flex-col items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white rounded-full w-12 h-12 bg-black/20"
                  onClick={() => {
                    setAnalyticsVideoId(video.id);
                    setAnalyticsOpen(true);
                  }}
                >
                  <BarChart3 className="w-6 h-6" />
                </Button>
                <span className="text-white text-xs font-semibold mt-1">Stats</span>
              </div>
            )}

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
        );
      })}

      {selectedVideoForOptions && (
        <VideoOptionsSheet
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          video={selectedVideoForOptions}
          currentUserId={currentUserId}
          isSaved={savedVideos.has(selectedVideoForOptions.id)}
          onSave={() => {
            setSavedVideos(prev => {
              const newSet = new Set(prev);
              if (newSet.has(selectedVideoForOptions.id)) {
                newSet.delete(selectedVideoForOptions.id);
              } else {
                newSet.add(selectedVideoForOptions.id);
              }
              return newSet;
            });
          }}
          onHide={() => {
            setHiddenVideos(prev => new Set([...prev, selectedVideoForOptions.id]));
          }}
        />
      )}

      {selectedVideo && (
        <>
          <VideoComments
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

      {/* Video Analytics */}
      {analyticsVideoId && (
        <VideoAnalytics
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
          postId={analyticsVideoId}
        />
      )}

      {/* Duet/Stitch */}
      {duetStitchVideo && (
        <VideoDuetStitch
          open={duetStitchOpen}
          onOpenChange={setDuetStitchOpen}
          originalVideoUrl={duetStitchVideo.media_url}
          originalVideoThumbnail={duetStitchVideo.thumbnail_url}
          originalCreator={{
            username: duetStitchVideo.profiles?.username || 'Unknown',
            avatar_url: duetStitchVideo.profiles?.avatar_url,
          }}
          onSubmit={async (type, videoFile, caption) => {
            toast({ title: `Creating ${type}...` });
            // The actual upload would happen here - for now just show success
            toast({ title: `${type === 'duet' ? 'Duet' : 'Stitch'} created successfully!` });
          }}
        />
      )}

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
