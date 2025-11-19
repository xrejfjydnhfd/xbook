import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StoryCreator } from "@/components/StoryCreator";

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    fetchStories();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      
      // Fetch current user profile
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

  const filteredPosts = posts.filter(post => 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button size="icon" onClick={() => navigate("/messages")}>
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="default" onClick={() => document.getElementById("create-post-content")?.focus()}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Stories */}
        <Card className="mb-4 p-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4">
              {/* Your Story - Facebook Style */}
              <div 
                className="flex flex-col items-center space-y-1 cursor-pointer"
                onClick={() => setShowStoryCreator(true)}
              >
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-primary ring-2 ring-primary/20">
                    <AvatarImage src={currentUserProfile?.avatar_url || ""} />
                    <AvatarFallback>
                      {currentUserProfile?.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-xs font-semibold">Your Story</span>
              </div>
              
              {stories.map((story) => (
                <div key={story.id} className="flex flex-col items-center space-y-1 cursor-pointer">
                  <Avatar className="w-16 h-16 border-4 border-accent ring-2 ring-accent/20">
                    <AvatarImage src={story.profiles.avatar_url || ""} />
                    <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate w-16 text-center">
                    {story.profiles.username}
                  </span>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>

        <StoryCreator
          open={showStoryCreator}
          onOpenChange={setShowStoryCreator}
          userId={currentUserId}
          onStoryCreated={() => {
            fetchStories();
            setShowStoryCreator(false);
          }}
        />

        <CreatePost userId={currentUserId} onPostCreated={fetchPosts} />

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>{searchQuery ? "No posts found" : "No posts yet. Be the first to post!"}</p>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </Layout>
  );
};

export default Home;