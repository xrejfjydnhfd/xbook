import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Heart, MessageCircle, Share2, UserPlus, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLogScreenProps {
  onBack: () => void;
  currentUserId: string;
}

interface Activity {
  id: string;
  type: "like" | "comment" | "share" | "follow";
  created_at: string;
  details: string;
}

const ActivityLogScreen = ({ onBack, currentUserId }: ActivityLogScreenProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    // Fetch likes
    const { data: likes } = await supabase
      .from("likes")
      .select("id, created_at, post_id")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch comments
    const { data: comments } = await supabase
      .from("comments")
      .select("id, created_at, content")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch follows
    const { data: follows } = await supabase
      .from("follows")
      .select("id, created_at, following_id")
      .eq("follower_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    const allActivities: Activity[] = [
      ...(likes?.map((l) => ({
        id: l.id,
        type: "like" as const,
        created_at: l.created_at || "",
        details: "Liked a post",
      })) || []),
      ...(comments?.map((c) => ({
        id: c.id,
        type: "comment" as const,
        created_at: c.created_at || "",
        details: `Commented: "${c.content?.slice(0, 30)}..."`,
      })) || []),
      ...(follows?.map((f) => ({
        id: f.id,
        type: "follow" as const,
        created_at: f.created_at || "",
        details: "Started following someone",
      })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(allActivities);
    setLoading(false);
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case "share":
        return <Share2 className="w-4 h-4 text-green-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-purple-500" />;
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const filteredActivities = activeTab === "all" 
    ? activities 
    : activities.filter((a) => a.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Activity Log</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="like">Likes</TabsTrigger>
          <TabsTrigger value="comment">Comments</TabsTrigger>
          <TabsTrigger value="follow">Follows</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-2">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No Activity</h3>
              <p className="text-sm">Your activity will appear here</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <Card key={activity.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.details}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActivityLogScreen;
