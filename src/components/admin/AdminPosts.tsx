import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Image as ImageIcon, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AdminPosts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post Deleted",
        description: "Post has been successfully deleted",
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setSelectedPost(null);
  };

  const filteredPosts = posts.filter((post) => {
    if (filterType === "all") return true;
    return post.media_type === filterType;
  });

  const photoCount = posts.filter((p) => p.media_type === "image").length;
  const videoCount = posts.filter((p) => p.media_type === "video").length;

  if (loading) {
    return <div className="text-center py-8">Loading posts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Post Management</h1>
          <p className="text-muted-foreground">Manage all user posts</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <ImageIcon className="w-4 h-4 mr-2" />
            {photoCount} Photos
          </Badge>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Video className="w-4 h-4 mr-2" />
            {videoCount} Videos
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setFilterType(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="image">Photos ({photoCount})</TabsTrigger>
          <TabsTrigger value="video">Videos ({videoCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {post.media_type === "image" ? "Photo" : "Video"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setSelectedPost(post)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {post.media_url && (
                    <div className="aspect-square bg-muted">
                      {post.media_type === "image" ? (
                        <img
                          src={post.media_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={post.media_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm font-medium">
                      @{post.profiles?.username}
                    </p>
                    {post.content && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {post.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeletePost(selectedPost?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
