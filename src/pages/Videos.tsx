import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Videos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchVideos();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchVideos = async () => {
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
      .eq("media_type", "video")
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: userId,
      });

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userId,
        from_user_id: currentUserId,
        type: "follow",
      });

      toast({
        title: "Following!",
        description: "You are now following this user",
      });
    } catch (error: any) {
      if (error.code === "23505") {
        toast({
          title: "Already following",
          description: "You are already following this user",
        });
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Videos
        </h1>

        {videos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No videos yet. Upload the first one!</p>
          </Card>
        ) : (
          videos.map((video) => (
            <Card key={video.id} className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div 
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={() => navigate(`/profile/${video.profiles.id}`)}
                >
                  <Avatar>
                    <AvatarImage src={video.profiles.avatar_url || ""} />
                    <AvatarFallback>{video.profiles.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{video.profiles.full_name || video.profiles.username}</p>
                    <p className="text-sm text-muted-foreground">@{video.profiles.username}</p>
                  </div>
                </div>
                {video.profiles.id !== currentUserId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFollow(video.profiles.id)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <video
                  src={video.media_url}
                  controls
                  className="w-full max-h-[500px]"
                />
                {video.content && (
                  <p className="px-6 py-3">{video.content}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-around pt-3">
                <Button variant="ghost" size="sm">
                  <Heart className="w-5 h-5 mr-1" />
                  Like
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="w-5 h-5 mr-1" />
                  Comment
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="w-5 h-5 mr-1" />
                  Share
                </Button>
                <Button variant="ghost" size="sm">
                  <Bookmark className="w-5 h-5 mr-1" />
                  Save
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
};

export default Videos;