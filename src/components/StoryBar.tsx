import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StoryViewer from "./StoryViewer";
import { StoryCreator } from "./StoryCreator";

interface Story {
  id: string;
  media_url: string;
  media_type: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface StoryBarProps {
  stories: Story[];
  currentUserId: string;
  currentUserProfile: {
    username: string;
    avatar_url: string | null;
  } | null;
  onStoryCreated: () => void;
}

const StoryBar = ({ stories, currentUserId, currentUserProfile, onStoryCreated }: StoryBarProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    const userId = story.profiles.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.profiles,
        stories: [],
        latestTime: story.created_at,
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {} as Record<string, { user: Story["profiles"]; stories: Story[]; latestTime: string }>);

  const userStoryGroups = Object.values(groupedStories);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const formatTime = (dateStr: string) => {
    const distance = formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    return distance.replace("about ", "").replace(" hours", "h").replace(" hour", "h")
      .replace(" minutes", "m").replace(" minute", "m").replace(" days", "d").replace(" day", "d");
  };

  return (
    <>
      <div className="bg-card py-3">
        <ScrollArea className="w-full">
          <div className="flex gap-3 px-3">
            {/* Your Story */}
            <div 
              className="flex flex-col items-center space-y-1 cursor-pointer min-w-[72px]"
              onClick={() => setCreatorOpen(true)}
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {currentUserProfile?.avatar_url ? (
                    <img 
                      src={currentUserProfile.avatar_url} 
                      alt="Your story" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-muted-foreground">
                      {currentUserProfile?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs font-medium text-center truncate w-16">Your Story</span>
            </div>

            {/* Other Stories */}
            {userStoryGroups.map((group, idx) => (
              <div 
                key={group.user.id}
                className="flex flex-col items-center space-y-1 cursor-pointer min-w-[72px]"
                onClick={() => openViewer(stories.findIndex(s => s.profiles.id === group.user.id))}
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-primary via-accent to-primary">
                    <div className="w-full h-full rounded-full bg-card p-[2px]">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={group.user.avatar_url || ""} className="object-cover" />
                        <AvatarFallback className="text-lg bg-secondary">
                          {group.user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-center truncate w-16">
                  {group.user.username}
                </span>
                <span className="text-[10px] text-muted-foreground -mt-1">
                  {formatTime(group.latestTime)}
                </span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      <StoryViewer
        stories={stories}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        currentUserId={currentUserId}
      />

      <StoryCreator
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        userId={currentUserId}
        onStoryCreated={() => {
          onStoryCreated();
          setCreatorOpen(false);
        }}
      />
    </>
  );
};

export default StoryBar;
