import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, UserPlus, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CommentsDialog from "@/components/CommentsDialog";
import ShareDialog from "@/components/ShareDialog";

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [videoLikes, setVideoLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, [currentVideoIndex]);

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

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  if (videos.length === 0) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <p className="text-muted-foreground">No videos yet</p>
        </div>
      </Layout>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        src={currentVideo.media_url}
        className="w-full h-full object-contain"
        loop
        playsInline
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
          onClick={() => navigate(`/profile/${currentVideo.profiles.id}`)}
        >
          <Avatar className="border-2 border-white">
            <AvatarImage src={currentVideo.profiles.avatar_url || ""} />
            <AvatarFallback>{currentVideo.profiles.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{currentVideo.profiles.full_name || currentVideo.profiles.username}</p>
            <p className="text-sm opacity-80">@{currentVideo.profiles.username}</p>
          </div>
        </div>
        {currentVideo.content && (
          <p className="text-sm mb-2">{currentVideo.content}</p>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-6 items-center z-10">
        {currentVideo.profiles.id !== currentUserId && (
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12"
            onClick={() => handleFollow(currentVideo.profiles.id)}
          >
            <UserPlus className="w-6 h-6" />
          </Button>
        )}
        
        <Button
          size="icon"
          variant="ghost"
          className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12 flex flex-col"
          onClick={() => handleLike(currentVideo.id, currentVideo.profiles.id)}
        >
          <Heart 
            className={`w-7 h-7 ${videoLikes[currentVideo.id]?.liked ? "fill-red-500 text-red-500" : ""}`} 
          />
          <span className="text-xs mt-1">{videoLikes[currentVideo.id]?.count || 0}</span>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12"
          onClick={() => {
            setSelectedVideo(currentVideo.id);
            setCommentsOpen(true);
          }}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12"
          onClick={() => {
            setSelectedVideo(currentVideo.id);
            setShareOpen(true);
          }}
        >
          <Share2 className="w-6 h-6" />
        </Button>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10">
        {currentVideoIndex > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 hover:bg-white/30 text-white rounded-full"
            onClick={handlePrevVideo}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        )}
        {currentVideoIndex < videos.length - 1 && (
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 hover:bg-white/30 text-white rounded-full"
            onClick={handleNextVideo}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        )}
      </div>

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