import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Image as ImageIcon, Video, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ArchiveScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const ArchiveScreen = ({ onBack, currentUserId }: ArchiveScreenProps) => {
  const [archivedPosts, setArchivedPosts] = useState<any[]>([]);
  const [archivedStories, setArchivedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    // In a real app, you'd have an "is_archived" column
    // For now, we'll show expired stories as archived
    const { data: stories } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", currentUserId)
      .lt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (stories) {
      setArchivedStories(stories);
    }
    setLoading(false);
  };

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
        <h2 className="text-xl font-bold">Archive</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Stories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {archivedPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No Archived Posts</h3>
              <p className="text-sm">Posts you archive will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {archivedPosts.map((post) => (
                <div key={post.id} className="aspect-square bg-secondary rounded-md overflow-hidden">
                  {post.media_type === "video" ? (
                    <video src={post.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stories" className="mt-4">
          {archivedStories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No Archived Stories</h3>
              <p className="text-sm">Your expired stories will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {archivedStories.map((story) => (
                <div key={story.id} className="aspect-[9/16] bg-secondary rounded-md overflow-hidden relative">
                  {story.media_type === "video" ? (
                    <video src={story.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
                    {new Date(story.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArchiveScreen;
