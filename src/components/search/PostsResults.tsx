import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface PostsResultsProps {
  posts: any[];
  loading: boolean;
}

const PostsResults = ({ posts, loading }: PostsResultsProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {posts.map((post: any) => (
        <Card key={post.id} className="p-4 cursor-pointer hover:bg-accent">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback>
                {post.profiles?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{post.profiles?.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {post.content && <p className="text-sm mb-3">{post.content}</p>}
          {post.media_url && (
            <>
              {post.media_type === "image" && (
                <img
                  src={post.media_url}
                  alt="Post"
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              {post.media_type === "video" && (
                <video
                  src={post.media_url}
                  controls
                  className="w-full rounded-lg max-h-96"
                />
              )}
            </>
          )}
        </Card>
      ))}
    </div>
  );
};

export default PostsResults;