import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Smile, Clock, Briefcase, Moon, Coffee, Plane, Heart, Music, Gamepad } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileStatusScreenProps {
  onBack: () => void;
  currentUserId: string;
}

const statusPresets = [
  { emoji: "😊", text: "Feeling happy", icon: Smile },
  { emoji: "💼", text: "At work", icon: Briefcase },
  { emoji: "🌙", text: "Sleeping", icon: Moon },
  { emoji: "☕", text: "Taking a break", icon: Coffee },
  { emoji: "✈️", text: "Traveling", icon: Plane },
  { emoji: "❤️", text: "In love", icon: Heart },
  { emoji: "🎵", text: "Listening to music", icon: Music },
  { emoji: "🎮", text: "Gaming", icon: Gamepad },
];

const ProfileStatusScreen = ({ onBack, currentUserId }: ProfileStatusScreenProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [customStatus, setCustomStatus] = useState("");
  const [duration, setDuration] = useState<"1h" | "4h" | "24h" | "week" | "forever">("24h");
  const { toast } = useToast();

  const handleSetStatus = () => {
    const status = selectedStatus || customStatus;
    if (!status) {
      toast({ title: "Please select or enter a status", variant: "destructive" });
      return;
    }

    // In a real app, save to database
    toast({ title: "Status updated!", description: status });
    onBack();
  };

  const handleClearStatus = () => {
    setSelectedStatus(null);
    setCustomStatus("");
    toast({ title: "Status cleared" });
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Profile Status</h2>
      </div>

      {/* Custom Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Status</label>
        <Input
          placeholder="What's on your mind?"
          value={customStatus}
          onChange={(e) => {
            setCustomStatus(e.target.value);
            setSelectedStatus(null);
          }}
        />
      </div>

      {/* Preset Status */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Quick Select</label>
        <div className="grid grid-cols-2 gap-2">
          {statusPresets.map((preset, index) => (
            <Button
              key={index}
              variant={selectedStatus === preset.text ? "default" : "outline"}
              className="justify-start h-auto py-3"
              onClick={() => {
                setSelectedStatus(preset.text);
                setCustomStatus("");
              }}
            >
              <span className="text-xl mr-2">{preset.emoji}</span>
              {preset.text}
            </Button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Clear after
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "1h", label: "1 hour" },
            { value: "4h", label: "4 hours" },
            { value: "24h", label: "24 hours" },
            { value: "week", label: "1 week" },
            { value: "forever", label: "Don't clear" },
          ].map((option) => (
            <Button
              key={option.value}
              variant={duration === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDuration(option.value as typeof duration)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleClearStatus}>
          Clear Status
        </Button>
        <Button className="flex-1" onClick={handleSetStatus}>
          Set Status
        </Button>
      </div>
    </div>
  );
};

export default ProfileStatusScreen;
