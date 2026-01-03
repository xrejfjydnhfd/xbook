import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Sparkles,
  Activity,
  BadgeCheck,
  Archive,
  Eye,
  Unlock,
  Clock,
  FileEdit,
  Tags,
  Shield,
  Search,
  Link,
  Copy,
  ChevronRight,
  User,
  Bell,
  Lock,
  HelpCircle,
  Info,
  QrCode,
  Star,
} from "lucide-react";
import ProfileSettingsScreen from "./screens/ProfileSettingsScreen";
import AddHighlightsScreen from "./screens/AddHighlightsScreen";
import ProfileStatusScreen from "./screens/ProfileStatusScreen";
import MetaVerifiedScreen from "./screens/MetaVerifiedScreen";
import ArchiveScreen from "./screens/ArchiveScreen";
import ViewAsScreen from "./screens/ViewAsScreen";
import UnlockProfileScreen from "./screens/UnlockProfileScreen";
import ActivityLogScreen from "./screens/ActivityLogScreen";
import ManagePostsScreen from "./screens/ManagePostsScreen";
import ReviewPostsTagsScreen from "./screens/ReviewPostsTagsScreen";
import PrivacyCenterScreen from "./screens/PrivacyCenterScreen";
import SearchProfileScreen from "./screens/SearchProfileScreen";

interface ProfileOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  username: string;
}

type ScreenType = 
  | "main"
  | "profile-settings"
  | "add-highlights"
  | "profile-status"
  | "meta-verified"
  | "archive"
  | "view-as"
  | "unlock-profile"
  | "activity-log"
  | "manage-posts"
  | "review-posts-tags"
  | "privacy-center"
  | "search-profile";

const ProfileOptionsSheet = ({
  open,
  onOpenChange,
  currentUserId,
  username,
}: ProfileOptionsSheetProps) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("main");
  const { toast } = useToast();

  const handleCopyLink = (type: "profile" | "account") => {
    const link = type === "profile" 
      ? `${window.location.origin}/profile/${currentUserId}`
      : `${window.location.origin}/account/${currentUserId}`;
    
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: `${type === "profile" ? "Profile" : "Account"} link copied to clipboard`,
    });
  };

  const handleBack = () => {
    setCurrentScreen("main");
  };

  const menuItems = [
    {
      id: "profile-settings",
      icon: Settings,
      label: "Profile Settings",
      description: "Edit your profile information",
    },
    {
      id: "add-highlights",
      icon: Sparkles,
      label: "Add Highlights",
      description: "Create story highlights",
    },
    {
      id: "profile-status",
      icon: Activity,
      label: "Profile Status",
      description: "Set your current status",
    },
    {
      id: "meta-verified",
      icon: BadgeCheck,
      label: "Meta Verified",
      description: "Get verified badge",
    },
    {
      id: "archive",
      icon: Archive,
      label: "Archive",
      description: "View archived posts and stories",
    },
    {
      id: "view-as",
      icon: Eye,
      label: "View As",
      description: "See how others view your profile",
    },
    {
      id: "unlock-profile",
      icon: Unlock,
      label: "Unlock Profile",
      description: "Manage profile access",
    },
    {
      id: "activity-log",
      icon: Clock,
      label: "Activity Log",
      description: "View your activity history",
    },
    {
      id: "manage-posts",
      icon: FileEdit,
      label: "Manage Posts",
      description: "Edit and delete your posts",
    },
    {
      id: "review-posts-tags",
      icon: Tags,
      label: "Review Posts and Tags",
      description: "Manage tagged posts",
    },
    {
      id: "privacy-center",
      icon: Shield,
      label: "Privacy Center",
      description: "Control your privacy settings",
    },
    {
      id: "search-profile",
      icon: Search,
      label: "Search",
      description: "Search your profile content",
    },
  ];

  const renderScreen = () => {
    switch (currentScreen) {
      case "profile-settings":
        return <ProfileSettingsScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "add-highlights":
        return <AddHighlightsScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "profile-status":
        return <ProfileStatusScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "meta-verified":
        return <MetaVerifiedScreen onBack={handleBack} />;
      case "archive":
        return <ArchiveScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "view-as":
        return <ViewAsScreen onBack={handleBack} currentUserId={currentUserId} username={username} />;
      case "unlock-profile":
        return <UnlockProfileScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "activity-log":
        return <ActivityLogScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "manage-posts":
        return <ManagePostsScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "review-posts-tags":
        return <ReviewPostsTagsScreen onBack={handleBack} currentUserId={currentUserId} />;
      case "privacy-center":
        return <PrivacyCenterScreen onBack={handleBack} />;
      case "search-profile":
        return <SearchProfileScreen onBack={handleBack} currentUserId={currentUserId} />;
      default:
        return null;
    }
  };

  if (currentScreen !== "main") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-xl">
          {renderScreen()}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl font-bold">Profile Options</SheetTitle>
        </SheetHeader>

        <div className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-between h-auto py-3 px-3 hover:bg-secondary/50"
              onClick={() => setCurrentScreen(item.id as ScreenType)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Button>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Copy Links Section */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-3">Share Your Profile</p>
          
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-3 px-3 hover:bg-secondary/50"
            onClick={() => handleCopyLink("profile")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Link className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Copy Profile Link</div>
                <div className="text-xs text-muted-foreground">Share your profile with others</div>
              </div>
            </div>
            <Copy className="w-5 h-5 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-3 px-3 hover:bg-secondary/50"
            onClick={() => handleCopyLink("account")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Copy Account Link</div>
                <div className="text-xs text-muted-foreground">Share your account link</div>
              </div>
            </div>
            <Copy className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileOptionsSheet;
