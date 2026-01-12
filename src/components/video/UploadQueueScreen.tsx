/**
 * Upload Queue Screen
 * 
 * Shows all ongoing uploads with:
 * - Per-file progress
 * - Pause/resume controls
 * - Network quality indicator
 * - Chunk-level progress details
 */

import { useEffect, useState } from "react";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Upload,
  Pause,
  Play,
  X,
  RotateCcw,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FileVideo,
  Clock,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UploadQueueScreenProps {
  userId: string;
  trigger?: React.ReactNode;
}

const UploadQueueScreen = ({ userId, trigger }: UploadQueueScreenProps) => {
  const {
    queue,
    networkQuality,
    isOnline,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    getActiveUploads,
  } = useUploadQueue(userId);

  const [open, setOpen] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return "Calculating...";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getNetworkIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4 text-destructive" />;
    switch (networkQuality) {
      case "excellent":
        return <SignalHigh className="w-4 h-4 text-green-500" />;
      case "good":
        return <SignalMedium className="w-4 h-4 text-green-500" />;
      case "moderate":
        return <SignalLow className="w-4 h-4 text-yellow-500" />;
      case "poor":
        return <Signal className="w-4 h-4 text-orange-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-destructive" />;
    }
  };

  const getNetworkLabel = () => {
    if (!isOnline) return "Offline";
    return networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "uploading":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case "processing":
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "complete":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      uploading: "default",
      paused: "outline",
      processing: "default",
      complete: "secondary",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize text-xs">
        {status}
      </Badge>
    );
  };

  const activeUploads = getActiveUploads();
  const hasActiveUploads = activeUploads.length > 0;
  const completedCount = queue.filter((u) => u.status === "complete").length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="relative">
            <Upload className="w-4 h-4 mr-2" />
            Upload Queue
            {hasActiveUploads && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeUploads.length}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Queue
            </span>
            <div className="flex items-center gap-2">
              {getNetworkIcon()}
              <span className="text-sm font-normal text-muted-foreground">
                {getNetworkLabel()}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="py-4">
          {/* Quick stats */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{activeUploads.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {queue.filter((u) => u.status === "pending" || u.status === "paused").length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="flex-1 p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>

          {/* Clear completed button */}
          {completedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mb-4"
              onClick={clearCompleted}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear {completedCount} completed
            </Button>
          )}

          {/* Queue list */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            {queue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No uploads in queue</p>
                <p className="text-sm mt-1">Select videos to start uploading</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((upload) => {
                  const percentage =
                    upload.fileSize > 0
                      ? Math.floor((upload.bytesUploaded / upload.fileSize) * 100)
                      : 0;

                  return (
                    <div
                      key={upload.id}
                      className="p-3 bg-card border rounded-lg space-y-2"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getStatusIcon(upload.status)}
                          <span className="text-sm font-medium truncate">
                            {upload.fileName}
                          </span>
                        </div>
                        {getStatusBadge(upload.status)}
                      </div>

                      {/* Progress bar */}
                      {upload.status !== "complete" && upload.status !== "failed" && (
                        <div className="space-y-1">
                          <Progress value={percentage} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentage}%</span>
                            <span>
                              {formatBytes(upload.bytesUploaded)} / {formatBytes(upload.fileSize)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      {upload.status === "uploading" && (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {upload.uploadSpeed > 0 && (
                            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                              <Wifi className="w-3 h-3" />
                              {formatSpeed(upload.uploadSpeed)}
                            </span>
                          )}
                          {upload.estimatedTimeRemaining > 0 && (
                            <span className="bg-muted px-2 py-1 rounded">
                              {formatTime(upload.estimatedTimeRemaining)} remaining
                            </span>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {upload.status === "failed" && upload.errorMessage && (
                        <p className="text-xs text-destructive">{upload.errorMessage}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 pt-1">
                        {upload.status === "pending" && upload.file && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => startUpload(upload.id)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}

                        {upload.status === "uploading" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => pauseUpload(upload.id)}
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                        )}

                        {upload.status === "paused" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => resumeUpload(upload.id)}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </Button>
                        )}

                        {upload.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => retryUpload(upload.id)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}

                        {upload.status !== "complete" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => cancelUpload(upload.id)}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UploadQueueScreen;
