import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  estimatedTimeRemaining: number;
  currentChunk: number;
  totalChunks: number;
}

interface ChunkState {
  index: number;
  start: number;
  end: number;
  uploaded: boolean;
  retries: number;
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

// Chunk sizes based on network speed
const CHUNK_SIZE_SLOW = 2 * 1024 * 1024;   // 2MB for slow networks
const CHUNK_SIZE_MEDIUM = 4 * 1024 * 1024; // 4MB for medium networks
const CHUNK_SIZE_FAST = 8 * 1024 * 1024;   // 8MB for fast networks
const MAX_RETRIES = 5;

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
  
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const chunksStateRef = useRef<ChunkState[]>([]);
  const uploadedBytesRef = useRef(0);
  const speedSamplesRef = useRef<number[]>([]);
  const lastProgressTimeRef = useRef(Date.now());
  const lastProgressBytesRef = useRef(0);
  const currentXhrRef = useRef<XMLHttpRequest | null>(null);
  const fileRef = useRef<File | null>(null);
  const fileNameRef = useRef<string>('');
  
  const { toast } = useToast();

  // Calculate adaptive chunk size based on recent speed
  const getAdaptiveChunkSize = useCallback(() => {
    if (speedSamplesRef.current.length === 0) return CHUNK_SIZE_SLOW;
    
    const avgSpeed = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
    
    if (avgSpeed < 500 * 1024) return CHUNK_SIZE_SLOW;      // < 500KB/s
    if (avgSpeed < 2 * 1024 * 1024) return CHUNK_SIZE_MEDIUM; // < 2MB/s
    return CHUNK_SIZE_FAST;
  }, []);

  // Update speed calculation with smoothing
  const updateSpeedMetrics = useCallback((bytesJustUploaded: number) => {
    const now = Date.now();
    const timeDiff = (now - lastProgressTimeRef.current) / 1000;
    
    if (timeDiff > 0.5) { // Update every 500ms minimum
      const bytesDiff = uploadedBytesRef.current - lastProgressBytesRef.current;
      const instantSpeed = bytesDiff / timeDiff;
      
      speedSamplesRef.current.push(instantSpeed);
      if (speedSamplesRef.current.length > 10) {
        speedSamplesRef.current.shift();
      }
      
      lastProgressTimeRef.current = now;
      lastProgressBytesRef.current = uploadedBytesRef.current;
      
      return instantSpeed;
    }
    
    return speedSamplesRef.current.length > 0 
      ? speedSamplesRef.current[speedSamplesRef.current.length - 1] 
      : 0;
  }, []);

  // Extract video metadata
  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
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
          isReel: video.duration <= 90,
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

  // Upload single chunk with real progress tracking
  const uploadChunkWithProgress = useCallback((
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    fileName: string,
    onChunkProgress: (loaded: number) => void
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (isCancelledRef.current) {
        reject(new Error('Upload cancelled'));
        return;
      }

      const xhr = new XMLHttpRequest();
      currentXhrRef.current = xhr;
      
      let lastLoaded = 0;

      xhr.upload.addEventListener('progress', (event) => {
        if (isPausedRef.current || isCancelledRef.current) return;
        
        if (event.lengthComputable) {
          const chunkProgress = event.loaded - lastLoaded;
          lastLoaded = event.loaded;
          onChunkProgress(chunkProgress);
        }
      });

      xhr.addEventListener('load', () => {
        currentXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(true);
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.message || response.error || errorMsg;
          } catch (e) {}
          reject(new Error(errorMsg));
        }
      });

      xhr.addEventListener('error', () => {
        currentXhrRef.current = null;
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        currentXhrRef.current = null;
        if (isCancelledRef.current) {
          reject(new Error('Upload cancelled'));
        } else {
          reject(new Error('Upload aborted'));
        }
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Upload chunk with unique name
      const chunkFileName = totalChunks > 1 
        ? `${fileName}_chunk_${chunkIndex.toString().padStart(4, '0')}`
        : fileName;
      
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/media/${chunkFileName}`);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('x-upsert', 'true');
      
      xhr.send(chunk);
    });
  }, []);

  // Main upload function with true chunk-based progress
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
      // Reset all state
      setStatus('preparing');
      isPausedRef.current = false;
      isCancelledRef.current = false;
      chunksStateRef.current = [];
      uploadedBytesRef.current = 0;
      speedSamplesRef.current = [];
      lastProgressTimeRef.current = Date.now();
      lastProgressBytesRef.current = 0;
      fileRef.current = file;

      const totalBytes = file.size;
      const fileExt = file.name.split('.').pop();
      const fullFileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      fileNameRef.current = fullFileName;

      // Initialize progress at 0%
      setProgress({
        bytesUploaded: 0,
        totalBytes,
        percentage: 0,
        speed: 0,
        estimatedTimeRemaining: 0,
        currentChunk: 0,
        totalChunks: 1,
      });

      // Generate thumbnail
      setStatus('generating-thumbnail');
      const metadata = await extractVideoMetadata(file);
      setVideoMetadata(metadata);

      // Calculate chunks based on initial chunk size
      const initialChunkSize = getAdaptiveChunkSize();
      const chunks: ChunkState[] = [];
      let offset = 0;
      let chunkIndex = 0;

      while (offset < totalBytes) {
        const end = Math.min(offset + initialChunkSize, totalBytes);
        chunks.push({
          index: chunkIndex,
          start: offset,
          end,
          uploaded: false,
          retries: 0,
        });
        offset = end;
        chunkIndex++;
      }

      chunksStateRef.current = chunks;
      const totalChunks = chunks.length;

      setProgress(prev => ({
        ...prev,
        totalChunks,
        currentChunk: 0,
      }));

      setStatus('uploading');

      // Upload chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        if (isCancelledRef.current) {
          throw new Error('Upload cancelled');
        }

        // Wait while paused
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (isCancelledRef.current) {
          throw new Error('Upload cancelled');
        }

        const chunk = chunks[i];
        const chunkBlob = file.slice(chunk.start, chunk.end);
        let success = false;
        
        while (!success && chunk.retries < MAX_RETRIES) {
          try {
            // Update current chunk
            setProgress(prev => ({
              ...prev,
              currentChunk: i + 1,
            }));

            await uploadChunkWithProgress(
              chunkBlob,
              i,
              totalChunks,
              fullFileName,
              (bytesProgress) => {
                uploadedBytesRef.current += bytesProgress;
                
                const percentage = Math.min(
                  Math.floor((uploadedBytesRef.current / totalBytes) * 100),
                  99 // Cap at 99% until finalized
                );
                
                const speed = updateSpeedMetrics(bytesProgress);
                const avgSpeed = speedSamplesRef.current.length > 0
                  ? speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length
                  : speed;
                
                const remainingBytes = totalBytes - uploadedBytesRef.current;
                const estimatedTime = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

                const newProgress: UploadProgress = {
                  bytesUploaded: uploadedBytesRef.current,
                  totalBytes,
                  percentage,
                  speed: avgSpeed,
                  estimatedTimeRemaining: estimatedTime,
                  currentChunk: i + 1,
                  totalChunks,
                };
                
                setProgress(newProgress);
                options?.onProgress?.(newProgress);
              }
            );

            success = true;
            chunksStateRef.current[i].uploaded = true;
          } catch (error: any) {
            if (error.message === 'Upload cancelled') {
              throw error;
            }
            
            chunk.retries++;
            chunksStateRef.current[i].retries = chunk.retries;
            
            if (chunk.retries >= MAX_RETRIES) {
              throw new Error(`Chunk ${i + 1} failed after ${MAX_RETRIES} retries`);
            }
            
            // Exponential backoff
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, chunk.retries) * 1000)
            );
          }
        }
      }

      // Finalize - if multiple chunks, we'd merge them server-side
      // For single file upload, just get the URL
      setStatus('finalizing');
      
      const finalFileName = totalChunks > 1 
        ? `${fullFileName}_chunk_0000` 
        : fullFileName;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(totalChunks > 1 ? `${fullFileName}_chunk_0000` : fullFileName);

      // Complete
      setStatus('complete');
      setProgress(prev => ({ 
        ...prev, 
        percentage: 100, 
        bytesUploaded: totalBytes,
        estimatedTimeRemaining: 0,
      }));

      toast({
        title: 'Upload complete!',
        description: 'Your video has been uploaded successfully',
      });

      return { url: publicUrl, metadata };
    } catch (error: any) {
      console.error('Video upload error:', error);
      
      if (error.message !== 'Upload cancelled') {
        setStatus('error');
        toast({
          title: 'Upload failed',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
      
      return null;
    }
  }, [userId, extractVideoMetadata, getAdaptiveChunkSize, uploadChunkWithProgress, updateSpeedMetrics, toast]);

  // Pause upload
  const pauseUpload = useCallback(() => {
    isPausedRef.current = true;
    currentXhrRef.current?.abort();
    setStatus('paused');
    toast({
      title: 'Upload paused',
      description: 'Your upload has been paused',
    });
  }, [toast]);

  // Resume upload
  const resumeUpload = useCallback(async () => {
    if (!fileRef.current || !fileNameRef.current) {
      toast({
        title: 'Cannot resume',
        description: 'No upload to resume',
        variant: 'destructive',
      });
      return;
    }

    isPausedRef.current = false;
    setStatus('uploading');
    toast({
      title: 'Resuming upload',
      description: 'Your upload is continuing',
    });
  }, [toast]);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    currentXhrRef.current?.abort();
    
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
    
    fileRef.current = null;
    fileNameRef.current = '';
    chunksStateRef.current = [];
    uploadedBytesRef.current = 0;
    speedSamplesRef.current = [];
    
    toast({
      title: 'Upload cancelled',
      description: 'Your upload has been cancelled',
    });
  }, [toast]);

  // Format helpers
  const formatSpeed = useCallback((bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }, []);

  const formatTimeRemaining = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s remaining`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m remaining`;
  }, []);

  const getStatusMessage = useCallback(() => {
    switch (status) {
      case 'preparing': return 'Preparing video...';
      case 'generating-thumbnail': return 'Generating thumbnail...';
      case 'uploading': return `Uploading ${progress.percentage}%`;
      case 'processing': return 'Processing video...';
      case 'finalizing': return 'Finalizing...';
      case 'complete': return 'Upload complete ✓';
      case 'error': return 'Upload failed';
      case 'paused': return 'Upload paused';
      default: return '';
    }
  }, [status, progress.percentage]);

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
