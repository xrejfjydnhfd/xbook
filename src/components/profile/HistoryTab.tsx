import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Play, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface HistoryTabProps {
  currentUserId: string;
}

const HistoryTab = ({ currentUserId }: HistoryTabProps) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [currentUserId]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("watch_history")
      .select(`
        *,
        posts:post_id (
          id,
          content,
          media_url,
          media_type,
          thumbnail_url,
          video_duration,
          created_at,
          profiles:user_id (
            username,
            avatar_url,
            full_name
          )
        )
      `)
      .eq("user_id", currentUserId)
      .order("watched_at", { ascending: false })
      .limit(10);

    if (data) {
      // Add progress from localStorage
      const historyWithProgress = data.map((item: any) => {
        const savedProgress = localStorage.getItem(`video_progress_${item.post_id}`);
        return {
          ...item,
          progress: savedProgress ? JSON.parse(savedProgress).percentage : 0,
        };
      });
      setHistory(historyWithProgress);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No watch history yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Videos you watch will appear here
        </p>
        <Button
          className="mt-4"
          onClick={() => navigate("/videos")}
        >
          <Play className="w-4 h-4 mr-2" />
          Browse Videos
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View all button */}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => navigate("/watch-history")}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          View Full Watch History
        </span>
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Recent history */}
      <div className="space-y-3">
        {history.slice(0, 5).map((item) => (
          <Card 
            key={item.id} 
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/videos?v=${item.post_id}`)}
          >
            <div className="flex gap-3">
              <div className="relative w-28 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                {item.posts?.thumbnail_url || item.posts?.media_url ? (
                  <img
                    src={item.posts.thumbnail_url || item.posts.media_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                
                {/* Duration badge */}
                {item.posts?.video_duration && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(item.posts.video_duration)}
                  </div>
                )}

                {/* Progress bar */}
                {item.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0">
                    <Progress value={item.progress} className="h-1 rounded-none" />
                  </div>
                )}

                {/* Resume indicator */}
                {item.progress > 5 && item.progress < 95 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="bg-white/90 rounded-full p-1.5">
                      <Play className="w-3 h-3 text-black fill-black" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">
                  {item.posts?.content || "Untitled video"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.posts?.profiles?.full_name || item.posts?.profiles?.username}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(item.watched_at), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {history.length > 5 && (
        <Button
          variant="ghost"
          className="w-full text-primary"
          onClick={() => navigate("/watch-history")}
        >
          See all {history.length} videos in history
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};

export default HistoryTab;
