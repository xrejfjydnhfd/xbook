import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PostCard from "@/components/PostCard";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
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
                  <Button variant="outline" size="icon">
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