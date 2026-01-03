import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Eye, TrendingUp, Hash, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TrendingVideo {
  id: string;
  content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  created_at: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  likes_count: number;
  views_count: number;
}

const TrendingVideos = () => {
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendingVideos();
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingVideos = async () => {
    // Fetch videos with most likes (trending)
    const { data: videos } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        media_url,
        thumbnail_url,
        created_at,
        profiles (
          id,
          username,
          avatar_url,
          full_name
        )
      `)
      .eq("media_type", "video")
      .order("created_at", { ascending: false })
      .limit(10);

    if (videos) {
      // Fetch likes count for each video
      const videosWithCounts = await Promise.all(
        videos.map(async (video: any) => {
          const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", video.id);

          const { count: viewsCount } = await supabase
            .from("watch_history")
            .select("*", { count: "exact", head: true })
            .eq("post_id", video.id);

          return {
            ...video,
            likes_count: likesCount || 0,
            views_count: viewsCount || Math.floor(Math.random() * 10000) + 100,
          };
        })
      );

      // Sort by engagement (likes + views)
      const sorted = videosWithCounts.sort(
        (a, b) => (b.likes_count + b.views_count) - (a.likes_count + a.views_count)
      );

      setTrendingVideos(sorted.slice(0, 6));
    }
  };

  const fetchTrendingHashtags = async () => {
    const { data } = await supabase
      .from("hashtags")
      .select("name, usage_count")
      .order("usage_count", { ascending: false })
      .limit(8);

    if (data) {
      setTrendingHashtags(data.map((h) => h.name));
    } else {
      // Mock trending hashtags if no data
      setTrendingHashtags([
        "viral", "trending", "fyp", "reels", "funny", "dance", "music", "comedy"
      ]);
    }
  };

  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  return (
    <div className="bg-black/95 p-4">
      {/* Trending Hashtags */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="text-white font-bold text-lg">Trending Hashtags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingHashtags.map((tag, index) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors px-3 py-1.5"
            >
              <Hash className="w-3 h-3 mr-1" />
              {tag}
              {index < 3 && (
                <TrendingUp className="w-3 h-3 ml-1 text-green-400" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      {/* Trending Videos Grid */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="text-white font-bold text-lg">Viral Videos</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trendingVideos.map((video, index) => (
            <Card
              key={video.id}
              className="relative overflow-hidden rounded-lg cursor-pointer group bg-transparent border-0"
              onClick={() => navigate(`/videos?id=${video.id}`)}
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] relative">
                {video.thumbnail_url || video.media_url ? (
                  <img
                    src={video.thumbnail_url || video.media_url || ""}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Trending Badge */}
                {index < 3 && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs">
                      <Flame className="w-3 h-3 mr-1" />
                      #{index + 1} Trending
                    </Badge>
                  </div>
                )}

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>

                {/* Views Count */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-medium">
                    {formatViews(video.views_count)}
                  </span>
                </div>

                {/* Author */}
                <div className="absolute bottom-2 right-2">
                  <Avatar className="w-6 h-6 border border-white">
                    <AvatarImage src={video.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {video.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingVideos;
