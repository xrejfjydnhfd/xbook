import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  EyeOff,
  Flag,
  FileText,
  Bell,
  Link2,
  Star,
  Clock,
  UserMinus,
  Ban,
  User,
  Settings2,
  X,
} from 'lucide-react';

interface VideoOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    content?: string | null;
    user_id: string;
    profiles?: {
      id: string;
      username: string;
      full_name?: string | null;
      avatar_url?: string | null;
    };
  };
  currentUserId: string;
  onSave?: () => void;
  onHide?: () => void;
  isSaved?: boolean;
}

interface OptionItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  danger?: boolean;
}

const OptionItem = ({ icon, title, subtitle, onClick, danger }: OptionItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors text-left ${
      danger ? 'text-destructive' : ''
    }`}
  >
    <div className={`mt-0.5 ${danger ? 'text-destructive' : 'text-muted-foreground'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className={`font-medium ${danger ? 'text-destructive' : 'text-foreground'}`}>
        {title}
      </p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  </button>
);

const VideoOptionsSheet = ({
  open,
  onOpenChange,
  video,
  currentUserId,
  onSave,
  onHide,
  isSaved = false,
}: VideoOptionsSheetProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const channelName = video.profiles?.full_name || video.profiles?.username || 'Unknown';

  const handleInterested = () => {
    toast({
      title: "Interested",
      description: "We'll show you more content like this",
    });
    onOpenChange(false);
  };

  const handleNotInterested = () => {
    toast({
      title: "Not Interested",
      description: "We'll show you less content like this",
    });
    onOpenChange(false);
  };

  const handleSaveReel = async () => {
    try {
      setIsLoading(true);
      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', video.id)
          .eq('user_id', currentUserId);
        toast({ title: "Removed from saved" });
      } else {
        await supabase.from('saved_posts').insert({
          post_id: video.id,
          user_id: currentUserId,
        });
        toast({ title: "Saved to your collection" });
      }
      onSave?.();
    } catch (error) {
      toast({ title: "Error saving reel", variant: "destructive" });
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleHidePost = () => {
    onHide?.();
    toast({
      title: "Post hidden",
      description: "You won't see this post again",
    });
    onOpenChange(false);
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for your feedback. We'll review this content.",
    });
    onOpenChange(false);
  };

  const handleRequestCommunityNote = () => {
    toast({
      title: "Community note requested",
      description: "Your request has been submitted for review",
    });
    onOpenChange(false);
  };

  const handleTurnOnNotifications = async () => {
    try {
      toast({
        title: "Notifications enabled",
        description: `You'll be notified when ${channelName} posts new content`,
      });
    } catch (error) {
      toast({ title: "Error enabling notifications", variant: "destructive" });
    }
    onOpenChange(false);
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/videos/${video.id}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Video link copied to clipboard",
      });
    } catch (error) {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
    onOpenChange(false);
  };

  const handleAddToFavorites = () => {
    toast({
      title: "Added to Favorites",
      description: `${channelName} has been added to your favorites`,
    });
    onOpenChange(false);
  };

  const handleSnooze = () => {
    toast({
      title: "Snoozed for 30 days",
      description: `You won't see posts from ${channelName} for 30 days`,
    });
    onOpenChange(false);
  };

  const handleUnfollow = async () => {
    try {
      setIsLoading(true);
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', video.user_id);
      toast({
        title: "Unfollowed",
        description: `You unfollowed ${channelName}`,
      });
    } catch (error) {
      toast({ title: "Error unfollowing", variant: "destructive" });
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleBlock = async () => {
    toast({
      title: "User blocked",
      description: `You've blocked ${channelName}. You won't see their content anymore.`,
    });
    onOpenChange(false);
  };

  const handleViewProfile = () => {
    window.location.href = `/profile/${video.profiles?.id}`;
  };

  const handleManageFeedback = () => {
    toast({
      title: "Manage Feedback",
      description: "Opening feedback preferences...",
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden">
        <SheetHeader className="p-4 pb-2 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Options</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-20">
          {/* Recommendation Options */}
          <div className="border-b">
            <OptionItem
              icon={<ThumbsUp className="h-5 w-5" />}
              title="Interested"
              subtitle="Show me more content like this"
              onClick={handleInterested}
            />
            <OptionItem
              icon={<ThumbsDown className="h-5 w-5" />}
              title="Not Interested"
              subtitle="Show me less content like this"
              onClick={handleNotInterested}
            />
          </div>

          {/* Save & Hide */}
          <div className="border-b">
            <OptionItem
              icon={<Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />}
              title={isSaved ? "Remove from Saved" : "Save Reel"}
              subtitle="Save this reel to your collection"
              onClick={handleSaveReel}
            />
            <OptionItem
              icon={<EyeOff className="h-5 w-5" />}
              title="Hide Post"
              subtitle="You won't see this post again"
              onClick={handleHidePost}
            />
          </div>

          {/* Report & Community */}
          <div className="border-b">
            <OptionItem
              icon={<Flag className="h-5 w-5" />}
              title="Report Post"
              subtitle="Report inappropriate content"
              onClick={handleReport}
            />
            <OptionItem
              icon={<FileText className="h-5 w-5" />}
              title="Request Community Note"
              subtitle="Request context about this post"
              onClick={handleRequestCommunityNote}
            />
          </div>

          {/* Notifications & Link */}
          <div className="border-b">
            <OptionItem
              icon={<Bell className="h-5 w-5" />}
              title="Turn on Notifications for this Post"
              subtitle="Get notified about new comments and reactions"
              onClick={handleTurnOnNotifications}
            />
            <OptionItem
              icon={<Link2 className="h-5 w-5" />}
              title="Copy Link"
              subtitle="Share this video with others"
              onClick={handleCopyLink}
            />
          </div>

          {/* Channel Options */}
          <div className="px-4 py-3 bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground">
              {channelName}
            </p>
          </div>
          <div className="border-b">
            <OptionItem
              icon={<Star className="h-5 w-5" />}
              title={`Add ${channelName} to Favorites`}
              subtitle="See their posts first in your feed"
              onClick={handleAddToFavorites}
            />
            <OptionItem
              icon={<Clock className="h-5 w-5" />}
              title={`Snooze ${channelName} for 30 Days`}
              subtitle="Temporarily stop seeing their posts"
              onClick={handleSnooze}
            />
            <OptionItem
              icon={<UserMinus className="h-5 w-5" />}
              title={`Unfollow ${channelName}`}
              subtitle="Stop following this creator"
              onClick={handleUnfollow}
            />
            <OptionItem
              icon={<Ban className="h-5 w-5" />}
              title={`Block ${channelName}`}
              subtitle="Block this user completely"
              onClick={handleBlock}
              danger
            />
            <OptionItem
              icon={<User className="h-5 w-5" />}
              title={`View ${channelName}'s Profile`}
              subtitle="See their profile and all posts"
              onClick={handleViewProfile}
            />
          </div>

          {/* Feedback */}
          <div>
            <OptionItem
              icon={<Settings2 className="h-5 w-5" />}
              title="Manage Your Feedback"
              subtitle="Control your content preferences"
              onClick={handleManageFeedback}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VideoOptionsSheet;
