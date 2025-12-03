import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock, Play } from "lucide-react";
import { format } from "date-fns";

interface HistoryTabProps {
  currentUserId: string;
}

const HistoryTab = ({ currentUserId }: HistoryTabProps) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          created_at,
          profiles:user_id (
            username,
            avatar_url,
            full_name
          )
        )
      `)
      .eq("user_id", currentUserId)
      .order("watched_at", { ascending: false });

    if (data) {
      setHistory(data);
    }
    setLoading(false);
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
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id} className="p-3">
          <div className="flex gap-3">
            <div className="relative w-24 h-16 flex-shrink-0">
              {item.posts?.media_type === "video" ? (
                <video
                  src={item.posts.media_url}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <img
                  src={item.posts?.media_url || "/placeholder.svg"}
                  alt=""
                  className="w-full h-full object-cover rounded"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-2">
                {item.posts?.content || "No caption"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.posts?.profiles?.full_name || item.posts?.profiles?.username}
              </p>
              <p className="text-xs text-muted-foreground">
                Watched {format(new Date(item.watched_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default HistoryTab;
