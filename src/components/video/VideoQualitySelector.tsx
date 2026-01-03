import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Check, Wifi, WifiLow, WifiOff } from "lucide-react";

export type VideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p";

interface VideoQualitySelectorProps {
  currentQuality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  availableQualities?: VideoQuality[];
  className?: string;
}

const qualityConfig: Record<VideoQuality, { label: string; bitrate: string; icon: React.ReactNode }> = {
  auto: { label: "Auto", bitrate: "Best for your connection", icon: <Wifi className="w-4 h-4" /> },
  "1080p": { label: "1080p HD", bitrate: "~5 Mbps", icon: <Wifi className="w-4 h-4" /> },
  "720p": { label: "720p HD", bitrate: "~2.5 Mbps", icon: <Wifi className="w-4 h-4" /> },
  "480p": { label: "480p", bitrate: "~1 Mbps", icon: <WifiLow className="w-4 h-4" /> },
  "360p": { label: "360p", bitrate: "~0.5 Mbps", icon: <WifiOff className="w-4 h-4" /> },
};

const VideoQualitySelector = ({
  currentQuality,
  onQualityChange,
  availableQualities = ["auto", "1080p", "720p", "480p", "360p"],
  className = "",
}: VideoQualitySelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (quality: VideoQuality) => {
    onQualityChange(quality);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-8 w-8 text-white hover:bg-white/20 ${className}`}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Video Quality
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableQualities.map((quality) => {
          const config = qualityConfig[quality];
          const isSelected = currentQuality === quality;

          return (
            <DropdownMenuItem
              key={quality}
              onClick={() => handleSelect(quality)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.bitrate}</div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VideoQualitySelector;
