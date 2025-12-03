import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Play, Bookmark } from "lucide-react";

interface SavedTabProps {
  currentUserId: string;
}

const SavedTab = ({ currentUserId }: SavedTabProps) => {
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedPosts();
  }, [currentUserId]);

  const fetchSavedPosts = async () => {
    const { data } = await supabase
      .from("saved_posts")
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
            avatar_url
          )
        )
      `)
      .eq("user_id", currentUserId)
      .order("saved_at", { ascending: false });

    if (data) {
      setSavedPosts(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (savedPosts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No saved videos yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Videos you save will appear here
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {savedPosts.map((saved) => (
        <div key={saved.id} className="aspect-[9/16] relative group cursor-pointer">
          {saved.posts?.media_type === "video" ? (
            <>
              <video
                src={saved.posts.media_url}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <Play className="w-8 h-8 text-white" />
              </div>
            </>
          ) : (
            <img
              src={saved.posts?.media_url || "/placeholder.svg"}
              alt=""
              className="w-full h-full object-cover rounded-lg"
            />
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
            <Play className="w-3 h-3" />
            <span>0</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedTab;
