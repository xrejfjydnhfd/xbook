import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings, LogOut, Plus, Image as ImageIcon, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PostCard from "@/components/PostCard";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      const profileId = userId || currentUserId;
      setIsOwnProfile(!userId || userId === currentUserId);
      fetchProfile(profileId);
      fetchUserPosts(profileId);
      fetchStories(profileId);
    }
  }, [currentUserId, userId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchProfile = async (profileId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchUserPosts = async (profileId: string) => {
    const { data } = await supabase
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
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });

    if (data) {
      setPosts(data);
    }
  };

  const fetchStories = async (profileId: string) => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", profileId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      setStories(data);
    }
  };

  const handleStoryUpload = async (type: "image" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : "video/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setLoading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        await supabase.from("stories").insert({
          user_id: currentUserId,
          media_url: publicUrl,
          media_type: type,
        });

        toast({ title: "Story posted!" });
        fetchStories(currentUserId);
      } catch (error) {
        toast({ title: "Error posting story", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!profile) {
    return <Layout><div className="text-center py-8">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">{profile.full_name || profile.username}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate(`/chat/${profile.id}`)}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm mb-4">{profile.bio}</p>
            )}

            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-bold">{posts.length}</span> Posts
              </div>
              <div>
                <span className="font-bold">0</span> Followers
              </div>
              <div>
                <span className="font-bold">0</span> Following
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwnProfile && (
          <Card className="mt-6 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Plus className="w-5 h-5" />
                <h3 className="font-semibold">Add to Story</h3>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleStoryUpload("image")}
                  disabled={loading}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStoryUpload("video")}
                  disabled={loading}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
              </div>
              {stories.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {stories.map((story) => (
                    <div key={story.id} className="relative">
                      {story.media_type === "image" ? (
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <video
                          src={story.media_url}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-bold mb-4">Posts</h2>
        {posts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No posts yet</p>
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

export default Profile;