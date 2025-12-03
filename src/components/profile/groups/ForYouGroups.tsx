import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import PostCard from "@/components/PostCard";

interface ForYouGroupsProps {
  currentUserId: string;
}

const ForYouGroups = ({ currentUserId }: ForYouGroupsProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupPosts();
  }, [currentUserId]);

  const fetchGroupPosts = async () => {
    // First get groups user has joined
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", currentUserId);

    if (memberships && memberships.length > 0) {
      // For now, show all posts (in a real app, we'd have group_posts table)
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setPosts(data);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No posts from your groups</p>
        <p className="text-sm text-muted-foreground mt-2">
          Join groups to see posts here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  );
};

export default ForYouGroups;
