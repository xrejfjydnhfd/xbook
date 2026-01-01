import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CreatePost from "@/components/CreatePost";
import FacebookPostCard from "@/components/FacebookPostCard";
import FacebookNav from "@/components/FacebookNav";
import StoryBar from "@/components/StoryBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import EnhancedVideoUpload from "@/components/video/EnhancedVideoUpload";
const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    fetchStories();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setCurrentUserProfile(profile);
      }
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      setStories(data);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-secondary/30">
        {/* Facebook-style Navigation */}
        <FacebookNav />

        {/* Main Content - with top padding for fixed nav */}
        <div className="pt-[104px] pb-4">
          {/* Stories Section */}
          <StoryBar 
            stories={stories}
            currentUserId={currentUserId}
            currentUserProfile={currentUserProfile}
            onStoryCreated={fetchStories}
          />

          {/* Divider */}
          <div className="h-2 bg-secondary/50" />

          {/* Create Post + Video Upload */}
          <div className="bg-card p-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CreatePost 
                  userId={currentUserId} 
                  userProfile={currentUserProfile}
                  onPostCreated={fetchPosts} 
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowVideoUpload(true)}
                className="h-10 w-10 shrink-0 bg-primary/10 border-primary/20 hover:bg-primary/20"
                title="Upload Video"
              >
                <Video className="h-5 w-5 text-primary" />
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-2 bg-secondary/50" />

          {/* Feed */}
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-20 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-full h-64" />
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="bg-card p-8 text-center text-muted-foreground">
                <p>No posts yet. Be the first to share something!</p>
              </div>
            ) : (
              posts.map((post) => (
                <FacebookPostCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentUserId}
                  onPostDeleted={fetchPosts}
                />
              ))
            )}
          </div>
        </div>

        {/* Enhanced Video Upload Dialog */}
        <EnhancedVideoUpload
          open={showVideoUpload}
          onOpenChange={setShowVideoUpload}
          userId={currentUserId}
          userProfile={currentUserProfile}
          onPostCreated={fetchPosts}
        />
      </div>
    </Layout>
  );
};

export default Home;
