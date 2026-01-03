import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Globe, Users, Lock, Eye } from "lucide-react";

interface ViewAsScreenProps {
  onBack: () => void;
  currentUserId: string;
  username: string;
}

const ViewAsScreen = ({ onBack, currentUserId, username }: ViewAsScreenProps) => {
  const [viewMode, setViewMode] = useState<"public" | "friends" | "specific">("public");

  const viewModes = [
    {
      id: "public",
      icon: Globe,
      title: "Public",
      description: "How anyone on Facebook sees your profile",
    },
    {
      id: "friends",
      icon: Users,
      title: "Friends",
      description: "How your friends see your profile",
    },
    {
      id: "specific",
      icon: Lock,
      title: "Specific Person",
      description: "Enter a friend's name to see their view",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">View As</h2>
      </div>

      {/* Description */}
      <div className="bg-secondary/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">Preview Your Profile</h3>
            <p className="text-sm text-muted-foreground">
              See how your profile appears to different people. This helps you understand what information is visible.
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Selection */}
      <div className="space-y-3">
        {viewModes.map((mode) => (
          <Card
            key={mode.id}
            className={`cursor-pointer transition-colors ${
              viewMode === mode.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
            }`}
            onClick={() => setViewMode(mode.id as typeof viewMode)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                viewMode === mode.id ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                <mode.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{mode.title}</h4>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
              {viewMode === mode.id && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">✓</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4 text-center">
          <Avatar className="w-16 h-16 mx-auto mb-3">
            <AvatarFallback>{username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-lg">{username}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Viewing as: {viewModes.find((m) => m.id === viewMode)?.title}
          </p>
          <Button variant="outline" size="sm">
            Open Full Preview
          </Button>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={onBack}>
        Done
      </Button>
    </div>
  );
};

export default ViewAsScreen;
