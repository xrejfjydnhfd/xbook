import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface FeelingSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (feeling: string) => void;
}

const feelings = [
  { emoji: "😊", label: "happy" },
  { emoji: "🥰", label: "loved" },
  { emoji: "😢", label: "sad" },
  { emoji: "😠", label: "angry" },
  { emoji: "😴", label: "tired" },
  { emoji: "🤔", label: "thoughtful" },
  { emoji: "😎", label: "cool" },
  { emoji: "🥳", label: "celebrating" },
  { emoji: "😇", label: "blessed" },
  { emoji: "🤩", label: "excited" },
  { emoji: "😌", label: "relaxed" },
  { emoji: "🙏", label: "grateful" },
  { emoji: "💪", label: "motivated" },
  { emoji: "🤗", label: "thankful" },
  { emoji: "😋", label: "hungry" },
  { emoji: "🎉", label: "festive" },
  { emoji: "❤️", label: "in love" },
  { emoji: "😤", label: "determined" },
  { emoji: "🥺", label: "emotional" },
  { emoji: "😂", label: "amused" },
];

const activities = [
  { emoji: "🎮", label: "playing games" },
  { emoji: "📺", label: "watching TV" },
  { emoji: "🎵", label: "listening to music" },
  { emoji: "📚", label: "reading" },
  { emoji: "🏃", label: "exercising" },
  { emoji: "🍳", label: "cooking" },
  { emoji: "✈️", label: "traveling" },
  { emoji: "🎂", label: "celebrating birthday" },
  { emoji: "☕", label: "drinking coffee" },
  { emoji: "🛒", label: "shopping" },
  { emoji: "🎬", label: "watching a movie" },
  { emoji: "💼", label: "working" },
];

const FeelingSelector = ({ open, onOpenChange, onSelect }: FeelingSelectorProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"feelings" | "activities">("feelings");

  const items = tab === "feelings" ? feelings : activities;
  const filtered = items.filter(item => 
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How are you feeling?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={tab === "feelings" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("feelings")}
            >
              Feelings
            </Button>
            <Button
              variant={tab === "activities" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("activities")}
            >
              Activities
            </Button>
          </div>

          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {filtered.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="justify-start h-auto py-2"
                onClick={() => onSelect(`${item.emoji} feeling ${item.label}`)}
              >
                <span className="text-xl mr-2">{item.emoji}</span>
                <span className="text-sm capitalize">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeelingSelector;
