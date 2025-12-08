import { useCallback, useRef, useEffect } from 'react';

interface PreloadedVideo {
  url: string;
  blob: Blob | null;
  objectUrl: string | null;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  progress: number;
}

const MAX_PRELOAD_VIDEOS = 3;
const PRELOAD_AHEAD = 2; // Preload 2 videos ahead

export const useVideoPreload = () => {
  const preloadedVideos = useRef<Map<string, PreloadedVideo>>(new Map());
  const preloadQueue = useRef<string[]>([]);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Preload a single video
  const preloadVideo = useCallback(async (url: string): Promise<void> => {
    if (preloadedVideos.current.has(url)) {
      const existing = preloadedVideos.current.get(url)!;
      if (existing.status === 'loaded' || existing.status === 'loading') {
        return;
      }
    }

    // Initialize entry
    preloadedVideos.current.set(url, {
      url,
      blob: null,
      objectUrl: null,
      status: 'loading',
      progress: 0,
    });

    const controller = new AbortController();
    abortControllers.current.set(url, controller);

    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        cache: 'force-cache',
      });
      
      if (!response.ok) throw new Error('Failed to fetch video');

      const reader = response.body?.getReader();
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');
      
      if (!reader) throw new Error('No reader available');

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        const progress = contentLength > 0 ? (receivedLength / contentLength) * 100 : 0;
        
        const current = preloadedVideos.current.get(url);
        if (current) {
          preloadedVideos.current.set(url, { ...current, progress });
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      const objectUrl = URL.createObjectURL(blob);

      preloadedVideos.current.set(url, {
        url,
        blob,
        objectUrl,
        status: 'loaded',
        progress: 100,
      });

      abortControllers.current.delete(url);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        preloadedVideos.current.set(url, {
          url,
          blob: null,
          objectUrl: null,
          status: 'error',
          progress: 0,
        });
      }
      abortControllers.current.delete(url);
    }
  }, []);

  // Preload multiple videos
  const preloadVideos = useCallback((urls: string[], currentIndex: number) => {
    // Clear videos that are far behind
    preloadedVideos.current.forEach((video, url) => {
      const videoIndex = urls.indexOf(url);
      if (videoIndex !== -1 && videoIndex < currentIndex - 1) {
        if (video.objectUrl) {
          URL.revokeObjectURL(video.objectUrl);
        }
        preloadedVideos.current.delete(url);
        
        const controller = abortControllers.current.get(url);
        if (controller) {
          controller.abort();
          abortControllers.current.delete(url);
        }
      }
    });

    // Preload upcoming videos
    for (let i = 0; i < PRELOAD_AHEAD; i++) {
      const nextIndex = currentIndex + i + 1;
      if (nextIndex < urls.length && preloadedVideos.current.size < MAX_PRELOAD_VIDEOS) {
        const url = urls[nextIndex];
        if (!preloadedVideos.current.has(url)) {
          preloadVideo(url);
        }
      }
    }
  }, [preloadVideo]);

  // Get preloaded video URL (returns object URL if available, original otherwise)
  const getPreloadedUrl = useCallback((url: string): string => {
    const preloaded = preloadedVideos.current.get(url);
    if (preloaded?.status === 'loaded' && preloaded.objectUrl) {
      return preloaded.objectUrl;
    }
    return url;
  }, []);

  // Check if video is preloaded
  const isPreloaded = useCallback((url: string): boolean => {
    const preloaded = preloadedVideos.current.get(url);
    return preloaded?.status === 'loaded';
  }, []);

  // Get preload progress
  const getPreloadProgress = useCallback((url: string): number => {
    const preloaded = preloadedVideos.current.get(url);
    return preloaded?.progress || 0;
  }, []);

  // Cancel all preloads
  const cancelAllPreloads = useCallback(() => {
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();

    preloadedVideos.current.forEach((video) => {
      if (video.objectUrl) {
        URL.revokeObjectURL(video.objectUrl);
      }
    });
    preloadedVideos.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllPreloads();
    };
  }, [cancelAllPreloads]);

  return {
    preloadVideo,
    preloadVideos,
    getPreloadedUrl,
    isPreloaded,
    getPreloadProgress,
    cancelAllPreloads,
  };
};
