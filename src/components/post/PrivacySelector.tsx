import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, Users, Lock, Check } from "lucide-react";

interface PrivacySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: "public" | "friends" | "only_me";
  onSelect: (privacy: "public" | "friends" | "only_me") => void;
}

const privacyOptions = [
  {
    value: "public" as const,
    icon: Globe,
    label: "Public",
    description: "Anyone on or off the app"
  },
  {
    value: "friends" as const,
    icon: Users,
    label: "Friends",
    description: "Your friends on the app"
  },
  {
    value: "only_me" as const,
    icon: Lock,
    label: "Only me",
    description: "Only you can see this"
  }
];

const PrivacySelector = ({ open, onOpenChange, selected, onSelect }: PrivacySelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Who can see your post?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {privacyOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              className="w-full justify-start h-auto py-3"
              onClick={() => onSelect(option.value)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <option.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {selected === option.value && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacySelector;
