/**
 * Network Quality Indicator
 * 
 * Shows current network quality and adaptive chunk size info
 */

import { NetworkQuality } from "@/lib/uploads/uploadQueueManager";
import {
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  WifiOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NetworkQualityIndicatorProps {
  quality: NetworkQuality;
  isOnline: boolean;
  showLabel?: boolean;
  className?: string;
}

const QUALITY_CONFIG: Record<
  NetworkQuality,
  {
    icon: typeof Signal;
    color: string;
    label: string;
    description: string;
    chunkSize: string;
  }
> = {
  excellent: {
    icon: SignalHigh,
    color: "text-green-500",
    label: "Excellent",
    description: "Ultra-fast connection detected",
    chunkSize: "10MB chunks",
  },
  good: {
    icon: SignalMedium,
    color: "text-green-500",
    label: "Good",
    description: "Fast connection detected",
    chunkSize: "6MB chunks",
  },
  moderate: {
    icon: SignalLow,
    color: "text-yellow-500",
    label: "Moderate",
    description: "Average connection speed",
    chunkSize: "4MB chunks",
  },
  poor: {
    icon: Signal,
    color: "text-orange-500",
    label: "Poor",
    description: "Slow connection detected",
    chunkSize: "2MB chunks",
  },
  offline: {
    icon: WifiOff,
    color: "text-destructive",
    label: "Offline",
    description: "No internet connection",
    chunkSize: "Paused",
  },
};

const NetworkQualityIndicator = ({
  quality,
  isOnline,
  showLabel = false,
  className = "",
}: NetworkQualityIndicatorProps) => {
  const effectiveQuality = isOnline ? quality : "offline";
  const config = QUALITY_CONFIG[effectiveQuality];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 ${className}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
          {showLabel && (
            <span className={`text-sm ${config.color}`}>{config.label}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-medium">{config.label} Network</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          <p className="text-xs">
            <span className="font-medium">Chunk size:</span> {config.chunkSize}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default NetworkQualityIndicator;
