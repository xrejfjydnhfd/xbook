import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    fetchStories();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
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
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Home
        </h1>

        {/* Stories */}
        <Card className="mb-4 p-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-4">
              <div className="flex flex-col items-center space-y-1 cursor-pointer">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-primary">
                    <AvatarFallback>+</AvatarFallback>
                  </Avatar>
                  <Plus className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full p-0.5" />
                </div>
                <span className="text-xs">Your Story</span>
              </div>
              
              {stories.map((story) => (
                <div key={story.id} className="flex flex-col items-center space-y-1 cursor-pointer">
                  <Avatar className="w-16 h-16 border-2 border-accent">
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

        <CreatePost userId={currentUserId} onPostCreated={fetchPosts} />

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No posts yet. Be the first to post!</p>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>
    </Layout>
  );
};

export default Home;