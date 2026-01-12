/**
 * Video Processing Status
 * 
 * Shows server-side video processing progress including:
 * - Transcoding to multiple qualities
 * - Thumbnail generation
 * - Processing status
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  Image,
  Zap,
} from "lucide-react";

interface ProcessingJob {
  id: string;
  status: string;
  progress: number;
  qualities: string[];
  thumbnail_urls: string[];
  error_message: string | null;
}

interface VideoProcessingStatusProps {
  postId?: string;
  uploadQueueId?: string;
}

const VideoProcessingStatus = ({
  postId,
  uploadQueueId,
}: VideoProcessingStatusProps) => {
  const [job, setJob] = useState<ProcessingJob | null>(null);

  useEffect(() => {
    if (!postId && !uploadQueueId) return;

    // Fetch initial status
    const fetchJob = async () => {
      const query = supabase
        .from("video_processing_jobs")
        .select("*");

      if (postId) {
        query.eq("post_id", postId);
      } else if (uploadQueueId) {
        query.eq("upload_queue_id", uploadQueueId);
      }

      const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (data) {
        setJob({
          id: data.id,
          status: data.status,
          progress: data.progress || 0,
          qualities: (data.qualities as string[]) || [],
          thumbnail_urls: (data.thumbnail_urls as string[]) || [],
          error_message: data.error_message,
        });
      }
    };

    fetchJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`processing-${postId || uploadQueueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_processing_jobs",
          filter: postId
            ? `post_id=eq.${postId}`
            : `upload_queue_id=eq.${uploadQueueId}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            setJob({
              id: data.id,
              status: data.status,
              progress: data.progress || 0,
              qualities: data.qualities || [],
              thumbnail_urls: data.thumbnail_urls || [],
              error_message: data.error_message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [postId, uploadQueueId]);

  if (!job) return null;

  const getStatusIcon = () => {
    switch (job.status) {
      case "pending":
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case "processing":
      case "transcoding":
        return <Film className="w-4 h-4 animate-pulse text-primary" />;
      case "generating_thumbnail":
        return <Image className="w-4 h-4 animate-pulse text-blue-500" />;
      case "complete":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusLabel = () => {
    switch (job.status) {
      case "pending":
        return "Waiting to process";
      case "processing":
        return "Processing video";
      case "transcoding":
        return "Transcoding to multiple qualities";
      case "generating_thumbnail":
        return "Generating thumbnails";
      case "complete":
        return "Processing complete";
      case "failed":
        return "Processing failed";
      default:
        return job.status;
    }
  };

  if (job.status === "complete") {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-600">Processing complete</span>
        {job.qualities.length > 0 && (
          <div className="flex gap-1 ml-auto">
            {job.qualities.map((q) => (
              <Badge key={q} variant="secondary" className="text-xs">
                {q}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="p-2 bg-destructive/10 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">Processing failed</span>
        </div>
        {job.error_message && (
          <p className="text-xs text-muted-foreground">{job.error_message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusLabel()}</span>
        </div>
        <span className="text-sm text-muted-foreground">{job.progress}%</span>
      </div>

      <Progress value={job.progress} className="h-1.5" />

      {/* Quality badges */}
      {job.qualities.length > 0 && (
        <div className="flex gap-1 pt-1">
          <span className="text-xs text-muted-foreground">Ready:</span>
          {job.qualities.map((q) => (
            <Badge key={q} variant="secondary" className="text-xs">
              {q}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoProcessingStatus;
