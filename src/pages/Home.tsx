import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CreatePost from "@/components/CreatePost";
import FacebookPostCard from "@/components/FacebookPostCard";
import FacebookNav from "@/components/FacebookNav";
import StoryBar from "@/components/StoryBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Video, Upload } from "lucide-react";
import EnhancedVideoUpload from "@/components/video/EnhancedVideoUpload";
import UploadQueueScreen from "@/components/video/UploadQueueScreen";
import NetworkQualityIndicator from "@/components/video/NetworkQualityIndicator";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { TooltipProvider } from "@/components/ui/tooltip";

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  
  // Pass userId to hook - it handles empty string gracefully
  const { queue, networkQuality, isOnline } = useUploadQueue(currentUserId);
  const activeUploads = queue.filter(u => u.status === "uploading" || u.status === "pending");

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
      <TooltipProvider>
        <div className="min-h-screen bg-secondary/30">
          {/* Facebook-style Navigation */}
          <FacebookNav />

          {/* Main Content - with top padding for fixed nav */}
          <div className="pt-[104px] pb-4 safe-area-bottom">
            {/* Stories Section */}
            <StoryBar 
              stories={stories}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              onStoryCreated={fetchStories}
            />

            {/* Divider */}
            <div className="h-2 bg-secondary/50" />

            {/* Create Post + Upload Queue + Network Indicator */}
            <div className="bg-card p-2.5 sm:p-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <CreatePost 
                    userId={currentUserId} 
                    userProfile={currentUserProfile}
                    onPostCreated={fetchPosts} 
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Network Quality Indicator */}
                  <NetworkQualityIndicator 
                    quality={networkQuality} 
                    isOnline={isOnline}
                  />
                  
                  {/* Upload Queue Button */}
                  <UploadQueueScreen 
                    userId={currentUserId}
                    trigger={
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 relative bg-secondary/50 border-border/50"
                      >
                        <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                        {activeUploads.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium">
                            {activeUploads.length}
                          </span>
                        )}
                      </Button>
                    }
                  />
                  
                  {/* Video Upload Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowVideoUpload(true)}
                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-primary/10 border-primary/20 hover:bg-primary/20"
                    title="Upload Video"
                  >
                    <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-2 bg-secondary/50" />

            {/* Feed */}
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card p-3 sm:p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="w-28 sm:w-32 h-4" />
                        <Skeleton className="w-16 sm:w-20 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-full h-48 sm:h-64" />
                  </div>
                ))
              ) : posts.length === 0 ? (
                <div className="bg-card p-6 sm:p-8 text-center text-muted-foreground">
                  <p className="text-sm sm:text-base">No posts yet. Be the first to share something!</p>
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
      </TooltipProvider>
    </Layout>
  );
};

export default Home;
