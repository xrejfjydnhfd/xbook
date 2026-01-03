import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Unlock, Lock, Users, Globe, Eye, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnlockProfileScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const UnlockProfileScreen = ({ onBack, currentUserId }: UnlockProfileScreenProps) => {
  const [settings, setSettings] = useState({
    isLocked: true,
    showToFriends: true,
    showToPublic: false,
    allowTagging: true,
    allowMentions: true,
  });
  const { toast } = useToast();

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast({ title: "Profile settings updated!" });
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Unlock Profile</h2>
      </div>

      {/* Current Status */}
      <Card className={settings.isLocked ? "border-yellow-500/50 bg-yellow-500/5" : "border-green-500/50 bg-green-500/5"}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            settings.isLocked ? "bg-yellow-500/20" : "bg-green-500/20"
          }`}>
            {settings.isLocked ? (
              <Lock className="w-6 h-6 text-yellow-600" />
            ) : (
              <Unlock className="w-6 h-6 text-green-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">
              Profile is {settings.isLocked ? "Locked" : "Unlocked"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {settings.isLocked 
                ? "Only approved people can see your content" 
                : "Your content is visible based on your settings"}
            </p>
          </div>
          <Switch
            checked={!settings.isLocked}
            onCheckedChange={() => handleToggle("isLocked")}
          />
        </CardContent>
      </Card>

      {/* Privacy Options */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground">Visibility Settings</h3>

        <Card>
          <CardContent className="divide-y">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Show to Friends</p>
                  <p className="text-xs text-muted-foreground">Friends can see your profile</p>
                </div>
              </div>
              <Switch
                checked={settings.showToFriends}
                onCheckedChange={() => handleToggle("showToFriends")}
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Show to Public</p>
                  <p className="text-xs text-muted-foreground">Anyone can find you</p>
                </div>
              </div>
              <Switch
                checked={settings.showToPublic}
                onCheckedChange={() => handleToggle("showToPublic")}
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Allow Tagging</p>
                  <p className="text-xs text-muted-foreground">Others can tag you in posts</p>
                </div>
              </div>
              <Switch
                checked={settings.allowTagging}
                onCheckedChange={() => handleToggle("allowTagging")}
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Allow Mentions</p>
                  <p className="text-xs text-muted-foreground">Others can mention you</p>
                </div>
              </div>
              <Switch
                checked={settings.allowMentions}
                onCheckedChange={() => handleToggle("allowMentions")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Button className="w-full" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
};

export default UnlockProfileScreen;
