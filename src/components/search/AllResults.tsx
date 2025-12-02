import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Video, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface AllResultsProps {
  results: any;
  loading: boolean;
}

const AllResults = ({ results, loading }: AllResultsProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasResults =
    results.users?.length > 0 ||
    results.reels?.length > 0 ||
    results.posts?.length > 0 ||
    results.groups?.length > 0 ||
    results.pages?.length > 0 ||
    results.events?.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Users Section */}
      {results.users?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">People</h2>
          <div className="space-y-2">
            {results.users.map((user: any) => (
              <Card
                key={user.id}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.username}</p>
                    {user.full_name && (
                      <p className="text-sm text-muted-foreground">{user.full_name}</p>
                    )}
                  </div>
                </div>
                <Button size="sm">Follow</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reels Section */}
      {results.reels?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Video className="h-5 w-5" />
            Trending Reels
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {results.reels.slice(0, 6).map((reel: any) => (
              <div
                key={reel.id}
                className="aspect-[9/16] rounded-lg bg-muted cursor-pointer overflow-hidden"
                onClick={() => navigate("/videos")}
              >
                <video src={reel.media_url} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts Section */}
      {results.posts?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Popular Posts
          </h2>
          <div className="space-y-3">
            {results.posts.slice(0, 3).map((post: any) => (
              <Card key={post.id} className="p-4 cursor-pointer hover:bg-accent">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback>
                      {post.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{post.profiles?.username}</p>
                  </div>
                </div>
                {post.content && (
                  <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                )}
                {post.media_url && post.media_type === "image" && (
                  <img
                    src={post.media_url}
                    alt="Post"
                    className="w-full rounded-lg max-h-60 object-cover"
                  />
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Groups Section */}
      {results.groups?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Groups
          </h2>
          <div className="space-y-2">
            {results.groups.map((group: any) => (
              <Card key={group.id} className="p-4 hover:bg-accent cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {group.member_count} members
                    </p>
                  </div>
                  <Button size="sm">Join</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pages Section */}
      {results.pages?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Pages</h2>
          <div className="space-y-2">
            {results.pages.map((page: any) => (
              <Card key={page.id} className="p-4 hover:bg-accent cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={page.profile_image} />
                      <AvatarFallback>{page.name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{page.name}</p>
                      {page.category && (
                        <p className="text-xs text-muted-foreground">{page.category}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {page.follower_count} followers
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Follow</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Events Section */}
      {results.events?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events
          </h2>
          <div className="space-y-2">
            {results.events.map((event: any) => (
              <Card key={event.id} className="p-4 hover:bg-accent cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {event.banner_image && (
                      <img
                        src={event.banner_image}
                        alt={event.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(event.event_date), "PPP")}
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {event.interested_count} interested
                    </p>
                  </div>
                  <Button size="sm" className="ml-3">
                    Interested
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllResults;