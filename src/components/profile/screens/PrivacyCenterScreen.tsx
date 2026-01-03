import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, Lock, Eye, Users, Bell, Globe, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PrivacyCenterScreenProps {
  onBack: () => void;
}

const PrivacyCenterScreen = ({ onBack }: PrivacyCenterScreenProps) => {
  const [settings, setSettings] = useState({
    profilePrivate: false,
    showActivityStatus: true,
    allowTagging: true,
    allowMentions: true,
    showOnlineStatus: true,
    allowMessages: true,
    showFollowers: true,
    showFollowing: true,
    showLikes: true,
  });
  const { toast } = useToast();

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast({ title: "Setting updated" });
  };

  const sections = [
    {
      title: "Profile Privacy",
      icon: Lock,
      items: [
        { key: "profilePrivate", label: "Private Account", description: "Only approved followers can see your posts" },
        { key: "showActivityStatus", label: "Show Activity Status", description: "Let others see when you're active" },
      ],
    },
    {
      title: "Interactions",
      icon: Users,
      items: [
        { key: "allowTagging", label: "Allow Tagging", description: "Let others tag you in posts" },
        { key: "allowMentions", label: "Allow Mentions", description: "Let others mention you in comments" },
        { key: "allowMessages", label: "Allow Messages", description: "Let anyone send you messages" },
      ],
    },
    {
      title: "Visibility",
      icon: Eye,
      items: [
        { key: "showOnlineStatus", label: "Show Online Status", description: "Let others see when you're online" },
        { key: "showFollowers", label: "Show Followers", description: "Display your follower count" },
        { key: "showFollowing", label: "Show Following", description: "Display who you follow" },
        { key: "showLikes", label: "Show Likes", description: "Display liked posts on your profile" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Privacy Center</h2>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="w-6 h-6 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">Your Privacy Matters</h3>
            <p className="text-sm text-muted-foreground">
              Control who can see your content and interact with you. These settings help keep your account secure.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Sections */}
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <section.icon className="w-5 h-5" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {section.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3">
                <div className="flex-1 pr-4">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={settings[item.key as keyof typeof settings]}
                  onCheckedChange={() => handleToggle(item.key as keyof typeof settings)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Additional Actions */}
      <Card>
        <CardContent className="p-0 divide-y">
          <Button variant="ghost" className="w-full justify-start h-auto py-4 px-4 rounded-none">
            <Download className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Download Your Data</p>
              <p className="text-xs text-muted-foreground">Get a copy of your information</p>
            </div>
          </Button>
          <Button variant="ghost" className="w-full justify-start h-auto py-4 px-4 rounded-none">
            <FileText className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Privacy Policy</p>
              <p className="text-xs text-muted-foreground">Read our privacy policy</p>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyCenterScreen;
