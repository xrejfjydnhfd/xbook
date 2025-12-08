import { useCallback, useRef, useEffect } from 'react';

interface CachedVideo {
  url: string;
  lastPlayed: number;
  playbackPosition: number;
  duration: number;
  viewCount: number;
}

const CACHE_KEY = 'video_cache';
const MAX_CACHED_VIDEOS = 50;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const useVideoCache = () => {
  const cacheRef = useRef<Map<string, CachedVideo>>(new Map());

  // Load cache from localStorage
  const loadCache = useCallback(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Filter expired entries
        Object.entries(parsed).forEach(([url, data]: [string, any]) => {
          if (now - data.lastPlayed < CACHE_EXPIRY) {
            cacheRef.current.set(url, data);
          }
        });
      }
    } catch (error) {
      console.error('Error loading video cache:', error);
    }
  }, []);

  // Save cache to localStorage
  const saveCache = useCallback(() => {
    try {
      const cacheObject: Record<string, CachedVideo> = {};
      cacheRef.current.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error saving video cache:', error);
    }
  }, []);

  // Cleanup old entries if cache is too large
  const cleanupCache = useCallback(() => {
    if (cacheRef.current.size > MAX_CACHED_VIDEOS) {
      const entries = Array.from(cacheRef.current.entries());
      entries.sort((a, b) => a[1].lastPlayed - b[1].lastPlayed);
      
      const toRemove = entries.slice(0, entries.length - MAX_CACHED_VIDEOS);
      toRemove.forEach(([url]) => {
        cacheRef.current.delete(url);
      });
    }
  }, []);

  // Save playback position
  const savePlaybackPosition = useCallback((url: string, position: number, duration: number) => {
    const existing = cacheRef.current.get(url);
    
    cacheRef.current.set(url, {
      url,
      lastPlayed: Date.now(),
      playbackPosition: position,
      duration,
      viewCount: (existing?.viewCount || 0) + (position < 1 ? 0 : 0), // Don't increment on every save
    });

    cleanupCache();
    saveCache();
  }, [cleanupCache, saveCache]);

  // Get saved playback position
  const getPlaybackPosition = useCallback((url: string): number => {
    const cached = cacheRef.current.get(url);
    return cached?.playbackPosition || 0;
  }, []);

  // Record video view
  const recordView = useCallback((url: string, duration: number) => {
    const existing = cacheRef.current.get(url);
    
    cacheRef.current.set(url, {
      url,
      lastPlayed: Date.now(),
      playbackPosition: 0,
      duration,
      viewCount: (existing?.viewCount || 0) + 1,
    });

    cleanupCache();
    saveCache();
  }, [cleanupCache, saveCache]);

  // Get watch history
  const getWatchHistory = useCallback((): CachedVideo[] => {
    return Array.from(cacheRef.current.values())
      .sort((a, b) => b.lastPlayed - a.lastPlayed);
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    localStorage.removeItem(CACHE_KEY);
  }, []);

  // Check if video was watched recently
  const wasWatchedRecently = useCallback((url: string, withinMs: number = 3600000): boolean => {
    const cached = cacheRef.current.get(url);
    if (!cached) return false;
    return Date.now() - cached.lastPlayed < withinMs;
  }, []);

  // Load cache on mount
  useEffect(() => {
    loadCache();
  }, [loadCache]);

  return {
    savePlaybackPosition,
    getPlaybackPosition,
    recordView,
    getWatchHistory,
    clearCache,
    wasWatchedRecently,
  };
};
