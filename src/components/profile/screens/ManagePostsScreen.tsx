import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Trash2, Archive, Eye, EyeOff, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ManagePostsScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const ManagePostsScreen = ({ onBack, currentUserId }: ManagePostsScreenProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const toggleSelect = (postId: string) => {
    setSelectedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map((p) => p.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedPosts.size === 0) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .in("id", Array.from(selectedPosts));

    if (error) {
      toast({ title: "Error deleting posts", variant: "destructive" });
    } else {
      toast({ title: `${selectedPosts.size} posts deleted` });
      setPosts((prev) => prev.filter((p) => !selectedPosts.has(p.id)));
      setSelectedPosts(new Set());
    }
  };

  const handleArchive = () => {
    toast({ title: `${selectedPosts.size} posts archived` });
    setSelectedPosts(new Set());
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
        <h2 className="text-xl font-bold">Manage Posts</h2>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={selectAll}>
          {selectedPosts.size === posts.length ? "Deselect All" : "Select All"}
        </Button>
        {selectedPosts.size > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedPosts.size > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedPosts.size} of {posts.length} posts selected
        </p>
      )}

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-1">No Posts</h3>
          <p className="text-sm">You haven't created any posts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`aspect-square relative cursor-pointer ${
                selectedPosts.has(post.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => toggleSelect(post.id)}
            >
              {post.media_url ? (
                post.media_type === "video" ? (
                  <>
                    <video
                      src={post.media_url}
                      className="w-full h-full object-cover"
                    />
                    <Video className="absolute top-1 right-1 w-4 h-4 text-white drop-shadow" />
                  </>
                ) : (
                  <img
                    src={post.media_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center p-2">
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {post.content || "No content"}
                  </p>
                </div>
              )}
              
              {/* Selection Overlay */}
              <div className="absolute top-1 left-1">
                <Checkbox
                  checked={selectedPosts.has(post.id)}
                  className="bg-background/80"
                />
              </div>
              
              {selectedPosts.has(post.id) && (
                <div className="absolute inset-0 bg-primary/20" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagePostsScreen;
