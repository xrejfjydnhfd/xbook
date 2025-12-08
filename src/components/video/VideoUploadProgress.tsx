import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Zap,
  Wifi
} from "lucide-react";

interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  currentChunk: number;
  totalChunks: number;
}

interface VideoUploadProgressProps {
  progress: UploadProgress;
  status: string;
  thumbnail?: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  formatSpeed: (bytes: number) => string;
  formatTimeRemaining: (seconds: number) => string;
}

const VideoUploadProgress = ({
  progress,
  status,
  thumbnail,
  onPause,
  onResume,
  onCancel,
  formatSpeed,
  formatTimeRemaining,
}: VideoUploadProgressProps) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
      case 'generating-thumbnail':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-primary animate-pulse" />;
      case 'processing':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'finalizing':
        return <Loader2 className="w-5 h-5 animate-spin text-green-500" />;
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing video...';
      case 'generating-thumbnail':
        return 'Generating thumbnail...';
      case 'uploading':
        return `Uploading... ${progress.percentage}%`;
      case 'processing':
        return 'Processing your video...';
      case 'finalizing':
        return 'Finalizing...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
      case 'paused':
        return 'Upload paused';
      default:
        return '';
    }
  };

  const isUploading = status === 'uploading';
  const isPaused = status === 'paused';
  const isComplete = status === 'complete';
  const isError = status === 'error';

  if (status === 'idle') return null;

  return (
    <div className="space-y-3 p-4 bg-muted/50 rounded-xl border border-border">
      {/* Thumbnail and main info */}
      <div className="flex gap-3">
        {thumbnail && (
          <div className="w-16 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img 
              src={thumbnail} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Status header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium text-sm">{getStatusText()}</span>
            </div>
            
            {/* Controls */}
            {(isUploading || isPaused) && (
              <div className="flex items-center gap-1">
                {isPaused ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={onResume}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={onPause}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={onCancel}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {!isComplete && !isError && (
            <Progress 
              value={progress.percentage} 
              className="h-2"
            />
          )}

          {/* Stats */}
          {isUploading && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
              </span>
              
              {progress.speed > 0 && (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {formatSpeed(progress.speed)}
                </span>
              )}
              
              {progress.estimatedTimeRemaining > 0 && progress.estimatedTimeRemaining < Infinity && (
                <span>
                  {formatTimeRemaining(progress.estimatedTimeRemaining)}
                </span>
              )}
              
              {progress.totalChunks > 1 && (
                <span>
                  Chunk {progress.currentChunk}/{progress.totalChunks}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoUploadProgress;
