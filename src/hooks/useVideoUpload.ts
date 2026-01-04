import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  currentChunk: number;
  totalChunks: number;
}

interface ChunkInfo {
  id: string;
  chunkNumber: number;
  uploaded: boolean;
  retryCount: number;
  size: number;
}

type UploadStatus = 
  | 'idle' 
  | 'preparing' 
  | 'uploading' 
  | 'processing' 
  | 'generating-thumbnail'
  | 'finalizing' 
  | 'complete' 
  | 'error'
  | 'paused';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
  isReel: boolean;
}

const CHUNK_SIZE_MIN = 5 * 1024 * 1024; // 5MB
const CHUNK_SIZE_MAX = 15 * 1024 * 1024; // 15MB
const MAX_RETRIES = 5;
const SPEED_TEST_INTERVAL = 3000; // 3 seconds

export const useVideoUpload = (userId: string) => {
  const [progress, setProgress] = useState<UploadProgress>({
    bytesUploaded: 0,
    totalBytes: 0,
    percentage: 0,
    speed: 0,
    estimatedTimeRemaining: 0,
    currentChunk: 0,
    totalChunks: 0,
  });
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const chunksRef = useRef<ChunkInfo[]>([]);
  const speedHistoryRef = useRef<number[]>([]);
  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  
  const { toast } = useToast();

  // Measure network speed and adapt chunk size
  const getAdaptiveChunkSize = useCallback(() => {
    if (speedHistoryRef.current.length === 0) return CHUNK_SIZE_MIN;
    
    const avgSpeed = speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length;
    
    // Slow network (< 1MB/s): use small chunks
    if (avgSpeed < 1024 * 1024) return CHUNK_SIZE_MIN;
    // Fast network (> 5MB/s): use large chunks
    if (avgSpeed > 5 * 1024 * 1024) return CHUNK_SIZE_MAX;
    // Medium: scale proportionally
    return Math.round(CHUNK_SIZE_MIN + ((avgSpeed - 1024 * 1024) / (4 * 1024 * 1024)) * (CHUNK_SIZE_MAX - CHUNK_SIZE_MIN));
  }, []);

  // Update speed measurement
  const updateSpeed = useCallback((bytesUploaded: number) => {
    const now = Date.now();
    const timeDiff = (now - lastTimeRef.current) / 1000;
    
    if (timeDiff >= SPEED_TEST_INTERVAL / 1000) {
      const bytesDiff = bytesUploaded - lastBytesRef.current;
      const speed = bytesDiff / timeDiff;
      
      speedHistoryRef.current.push(speed);
      if (speedHistoryRef.current.length > 5) speedHistoryRef.current.shift();
      
      lastBytesRef.current = bytesUploaded;
      lastTimeRef.current = now;
      
      return speed;
    }
    
    return speedHistoryRef.current.length > 0 
      ? speedHistoryRef.current[speedHistoryRef.current.length - 1] 
      : 0;
  }, []);

  // Extract video metadata and generate thumbnail
  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Seek to 1 second for thumbnail
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        
        resolve({
          duration: Math.round(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnail,
          isReel: video.duration <= 90, // 1:30 max for reels
        });
        
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Compress video using canvas (basic compression for web)
  const compressVideo = useCallback(async (file: File): Promise<File> => {
    // For now, return original file - real compression would need WebCodecs API
    // or server-side processing with FFmpeg
    return file;
  }, []);

  // Split file into chunks
  const createChunks = useCallback((file: File): Blob[] => {
    const chunkSize = getAdaptiveChunkSize();
    const chunks: Blob[] = [];
    let offset = 0;
    
    while (offset < file.size) {
      chunks.push(file.slice(offset, offset + chunkSize));
      offset += chunkSize;
    }
    
    return chunks;
  }, [getAdaptiveChunkSize]);

  // Upload a single chunk with retry logic
  const uploadChunk = useCallback(async (
    chunk: Blob, 
    chunkNumber: number, 
    fileName: string,
    totalChunks: number
  ): Promise<boolean> => {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      if (isPausedRef.current) {
        return false;
      }
      
      try {
        const chunkFileName = `${fileName}_chunk_${chunkNumber}`;
        
        const { error } = await supabase.storage
          .from('media')
          .upload(chunkFileName, chunk, {
            cacheControl: '3600',
            upsert: true,
          });
        
        if (error) throw error;
        
        chunksRef.current[chunkNumber] = {
          ...chunksRef.current[chunkNumber],
          uploaded: true,
        };
        
        return true;
      } catch (error) {
        retries++;
        chunksRef.current[chunkNumber] = {
          ...chunksRef.current[chunkNumber],
          retryCount: retries,
        };
        
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
    
    return false;
  }, []);

  // Main upload function - uses XMLHttpRequest for real progress tracking
  const uploadVideo = useCallback(async (
    file: File,
    options?: {
      quality?: 'auto' | 'hd' | 'sd';
      onProgress?: (progress: UploadProgress) => void;
    }
  ): Promise<{ url: string; metadata: VideoMetadata } | null> => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a video file',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Reset state
      setStatus('preparing');
      isPausedRef.current = false;
      chunksRef.current = [];
      speedHistoryRef.current = [];
      lastBytesRef.current = 0;
      lastTimeRef.current = Date.now();
      abortControllerRef.current = new AbortController();

      const totalBytes = file.size;

      setProgress({
        bytesUploaded: 0,
        totalBytes,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        currentChunk: 0,
        totalChunks: 1,
      });

      // Extract metadata and generate thumbnail
      setStatus('generating-thumbnail');
      const metadata = await extractVideoMetadata(file);
      setVideoMetadata(metadata);

      // Compress if needed (optional based on quality setting)
      const processedFile = options?.quality === 'sd' 
        ? await compressVideo(file) 
        : file;

      // Start upload with real progress tracking using XMLHttpRequest
      setStatus('uploading');
      const fileExt = file.name.split('.').pop();
      const fullFileName = `${userId}/${Date.now()}.${fileExt}`;
      
      // Use XMLHttpRequest for real-time progress tracking
      const uploadWithProgress = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (isPausedRef.current) return;
            
            if (event.lengthComputable) {
              const bytesUploaded = event.loaded;
              const now = Date.now();
              const timeDiff = (now - lastTimeRef.current) / 1000;
              
              // Calculate speed
              let currentSpeed = 0;
              if (timeDiff >= 1) {
                const bytesDiff = bytesUploaded - lastBytesRef.current;
                currentSpeed = bytesDiff / timeDiff;
                
                speedHistoryRef.current.push(currentSpeed);
                if (speedHistoryRef.current.length > 5) speedHistoryRef.current.shift();
                
                lastBytesRef.current = bytesUploaded;
                lastTimeRef.current = now;
              } else if (speedHistoryRef.current.length > 0) {
                currentSpeed = speedHistoryRef.current[speedHistoryRef.current.length - 1];
              }
              
              const avgSpeed = speedHistoryRef.current.length > 0
                ? speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length
                : currentSpeed;
              
              const remainingBytes = totalBytes - bytesUploaded;
              const estimatedTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;
              const percentage = Math.round((bytesUploaded / totalBytes) * 100);
              
              const newProgress: UploadProgress = {
                bytesUploaded,
                totalBytes,
                percentage,
                speed: avgSpeed,
                estimatedTimeRemaining: estimatedTime,
                currentChunk: 1,
                totalChunks: 1,
              };
              
              setProgress(newProgress);
              options?.onProgress?.(newProgress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              // Try to parse error message
              let errorMsg = `Upload failed with status ${xhr.status}`;
              try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.message || response.error || errorMsg;
              } catch (e) {}
              reject(new Error(errorMsg));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });

          // Get Supabase URL and key from environment
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          xhr.open('POST', `${supabaseUrl}/storage/v1/object/media/${fullFileName}`);
          xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
          xhr.setRequestHeader('x-upsert', 'true');
          
          // Store abort reference
          const originalAbort = abortControllerRef.current;
          abortControllerRef.current = {
            abort: () => xhr.abort(),
            signal: originalAbort?.signal || new AbortController().signal,
          } as AbortController;
          
          xhr.send(processedFile);
        });
      };

      await uploadWithProgress();

      setStatus('finalizing');
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fullFileName);

      setStatus('complete');
      setProgress(prev => ({ ...prev, percentage: 100, bytesUploaded: totalBytes }));

      return { url: publicUrl, metadata };
    } catch (error: any) {
      console.error('Video upload error:', error);
      setStatus('error');
      toast({
        title: 'Upload failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, extractVideoMetadata, compressVideo, toast]);

  // Pause upload
  const pauseUpload = useCallback(() => {
    isPausedRef.current = true;
    setStatus('paused');
  }, []);

  // Resume upload
  const resumeUpload = useCallback(() => {
    isPausedRef.current = false;
    setStatus('uploading');
  }, []);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    isPausedRef.current = true;
    abortControllerRef.current?.abort();
    setStatus('idle');
    setProgress({
      bytesUploaded: 0,
      totalBytes: 0,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
      currentChunk: 0,
      totalChunks: 0,
    });
  }, []);

  // Get status message
  const getStatusMessage = useCallback(() => {
    switch (status) {
      case 'preparing': return 'Preparing video...';
      case 'generating-thumbnail': return 'Generating thumbnail...';
      case 'uploading': return `Uploading... ${progress.percentage}%`;
      case 'processing': return 'Processing video...';
      case 'finalizing': return 'Finalizing...';
      case 'complete': return 'Upload complete ✓';
      case 'error': return 'Upload failed';
      case 'paused': return 'Upload paused';
      default: return '';
    }
  }, [status, progress.percentage]);

  // Format speed for display
  const formatSpeed = useCallback((bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }, []);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    return `${Math.round(seconds / 3600)}h remaining`;
  }, []);

  return {
    uploadVideo,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    progress,
    status,
    videoMetadata,
    getStatusMessage,
    formatSpeed,
    formatTimeRemaining,
    isUploading: status === 'uploading' || status === 'processing' || status === 'finalizing',
    isPaused: status === 'paused',
    isComplete: status === 'complete',
    isError: status === 'error',
  };
};
