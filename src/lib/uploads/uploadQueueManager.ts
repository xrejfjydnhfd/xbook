/**
 * Upload Queue Manager
 * 
 * Manages a persistent queue of video uploads with:
 * - LocalStorage persistence for resume after refresh
 * - Realtime sync with Supabase
 * - Network quality detection
 * - Adaptive chunk sizing
 * - Content hash deduplication
 */

import { supabase } from "@/integrations/supabase/client";

export interface QueuedUpload {
  id: string;
  userId: string;
  file: File | null; // null when restored from storage
  fileName: string;
  fileSize: number;
  fileType: string;
  contentHash: string | null;
  objectName: string | null;
  status: "pending" | "uploading" | "paused" | "processing" | "complete" | "failed";
  bytesUploaded: number;
  uploadSpeed: number;
  estimatedTimeRemaining: number;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  tusUploadUrl: string | null;
}

export type NetworkQuality = "excellent" | "good" | "moderate" | "poor" | "offline";

const STORAGE_KEY = "video_upload_queue";
const CHUNK_SIZES: Record<NetworkQuality, number> = {
  // Keep chunk size within 5MB–10MB (as required)
  excellent: 10 * 1024 * 1024, // 10MB
  good: 8 * 1024 * 1024,       // 8MB
  moderate: 6 * 1024 * 1024,   // 6MB
  poor: 5 * 1024 * 1024,       // 5MB
  offline: 0,
};

class UploadQueueManager {
  private queue: Map<string, QueuedUpload> = new Map();
  private listeners: Set<(queue: QueuedUpload[]) => void> = new Set();
  private networkQuality: NetworkQuality = "good";
  private speedSamples: number[] = [];
  private isInitialized = false;

  async initialize(userId: string) {
    if (this.isInitialized) return;
    
    // Load from localStorage
    this.loadFromStorage();

    // Sync with Supabase
    await this.syncWithDatabase(userId);

    // Start network monitoring
    this.startNetworkMonitoring();

    this.isInitialized = true;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: QueuedUpload[] = JSON.parse(stored);
        items.forEach((item) => {
          // Mark as pending for resume (file needs to be re-selected)
          this.queue.set(item.id, {
            ...item,
            file: null, // File objects can't be stored in localStorage
            status: item.status === "uploading" ? "paused" : item.status,
          });
        });
      }
    } catch (e) {
      console.error("Failed to load upload queue from storage:", e);
    }
  }

  private saveToStorage() {
    try {
      const items = Array.from(this.queue.values()).map((item) => ({
        ...item,
        file: null, // Don't try to serialize File
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save upload queue to storage:", e);
    }
  }

  private async syncWithDatabase(userId: string) {
    try {
      const { data, error } = await supabase
        .from("upload_queue")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending", "uploading", "paused", "processing"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        data.forEach((row: any) => {
          if (!this.queue.has(row.id)) {
            this.queue.set(row.id, {
              id: row.id,
              userId: row.user_id,
              file: null,
              fileName: row.file_name,
              fileSize: row.file_size,
              fileType: row.file_type,
              contentHash: row.content_hash,
              objectName: row.object_name,
              status: row.status,
              bytesUploaded: row.bytes_uploaded || 0,
              uploadSpeed: row.upload_speed || 0,
              estimatedTimeRemaining: 0,
              errorMessage: row.error_message,
              retryCount: row.retry_count || 0,
              createdAt: row.created_at,
              tusUploadUrl: row.tus_upload_url,
            });
          }
        });
      }

      this.notifyListeners();
    } catch (e) {
      console.error("Failed to sync with database:", e);
    }
  }

  private startNetworkMonitoring() {
    // Check connection type if available
    const connection = (navigator as any).connection;
    if (connection) {
      this.updateNetworkQuality(connection);
      connection.addEventListener("change", () => {
        this.updateNetworkQuality(connection);
      });
    }

    // Monitor online/offline
    window.addEventListener("online", () => {
      this.networkQuality = "moderate"; // Start conservative after reconnect
      this.notifyListeners();
    });

    window.addEventListener("offline", () => {
      this.networkQuality = "offline";
      this.notifyListeners();
    });
  }

  private updateNetworkQuality(connection: any) {
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink || 0;

    if (!navigator.onLine) {
      this.networkQuality = "offline";
    } else if (effectiveType === "4g" && downlink > 10) {
      this.networkQuality = "excellent";
    } else if (effectiveType === "4g" || (effectiveType === "3g" && downlink > 2)) {
      this.networkQuality = "good";
    } else if (effectiveType === "3g") {
      this.networkQuality = "moderate";
    } else {
      this.networkQuality = "poor";
    }

    this.notifyListeners();
  }

  // Calculate content hash for deduplication
  async calculateContentHash(file: File): Promise<string> {
    // For large files, we hash first + last 1MB + file size
    const chunkSize = 1024 * 1024;
    const start = file.slice(0, chunkSize);
    const end = file.slice(-chunkSize);
    const sizeBuffer = new TextEncoder().encode(file.size.toString());

    const combined = new Uint8Array(
      await new Blob([start, end, sizeBuffer]).arrayBuffer()
    );

    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Check for duplicate upload
  async checkDuplicate(contentHash: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("upload_queue")
        .select("object_name")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .eq("status", "complete")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.object_name || null;
    } catch {
      return null;
    }
  }

  // Add upload to queue
  async addToQueue(
    file: File,
    userId: string
  ): Promise<{ queuedUpload: QueuedUpload; isDuplicate: boolean; existingUrl?: string }> {
    const contentHash = await this.calculateContentHash(file);

    // Check for duplicate
    const existingObject = await this.checkDuplicate(contentHash, userId);
    if (existingObject) {
      const { data } = supabase.storage.from("media").getPublicUrl(existingObject);
      return {
        queuedUpload: null as any,
        isDuplicate: true,
        existingUrl: data.publicUrl,
      };
    }

    const id = crypto.randomUUID();
    const queuedUpload: QueuedUpload = {
      id,
      userId,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      contentHash,
      objectName: null,
      status: "pending",
      bytesUploaded: 0,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      tusUploadUrl: null,
    };

    this.queue.set(id, queuedUpload);
    this.saveToStorage();

    // Persist to Supabase
    await supabase.from("upload_queue").insert({
      id,
      user_id: userId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      content_hash: contentHash,
      status: "pending",
    });

    this.notifyListeners();
    return { queuedUpload, isDuplicate: false };
  }

  // Update upload progress
  updateProgress(id: string, updates: Partial<QueuedUpload>) {
    const upload = this.queue.get(id);
    if (!upload) return;

    Object.assign(upload, updates);

    // Update speed samples for adaptive chunking
    if (updates.uploadSpeed && updates.uploadSpeed > 0) {
      this.speedSamples.push(updates.uploadSpeed);
      if (this.speedSamples.length > 20) {
        this.speedSamples.shift();
      }
      this.updateNetworkQualityFromSpeed();
    }

    this.saveToStorage();
    this.notifyListeners();
  }

  private updateNetworkQualityFromSpeed() {
    if (this.speedSamples.length < 3) return;

    const avg = this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;
    const mbps = avg / (1024 * 1024);

    if (mbps > 5) {
      this.networkQuality = "excellent";
    } else if (mbps > 2) {
      this.networkQuality = "good";
    } else if (mbps > 0.5) {
      this.networkQuality = "moderate";
    } else {
      this.networkQuality = "poor";
    }
  }

  // Get adaptive chunk size based on network quality
  getAdaptiveChunkSize(): number {
    return CHUNK_SIZES[this.networkQuality] || CHUNK_SIZES.moderate;
  }

  // Mark upload as complete
  async completeUpload(id: string, objectName: string) {
    const upload = this.queue.get(id);
    if (!upload) return;

    upload.status = "complete";
    upload.objectName = objectName;
    upload.bytesUploaded = upload.fileSize;

    await supabase
      .from("upload_queue")
      .update({
        status: "complete",
        object_name: objectName,
        bytes_uploaded: upload.fileSize,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    this.saveToStorage();
    this.notifyListeners();
  }

  // Mark upload as failed
  async failUpload(id: string, errorMessage: string) {
    const upload = this.queue.get(id);
    if (!upload) return;

    upload.status = "failed";
    upload.errorMessage = errorMessage;
    upload.retryCount += 1;

    await supabase
      .from("upload_queue")
      .update({
        status: "failed",
        error_message: errorMessage,
        retry_count: upload.retryCount,
      })
      .eq("id", id);

    this.saveToStorage();
    this.notifyListeners();
  }

  // Pause upload
  pauseUpload(id: string) {
    const upload = this.queue.get(id);
    if (!upload) return;

    upload.status = "paused";
    this.saveToStorage();

    supabase
      .from("upload_queue")
      .update({ status: "paused" })
      .eq("id", id)
      .then();

    this.notifyListeners();
  }

  // Resume upload
  resumeUpload(id: string) {
    const upload = this.queue.get(id);
    if (!upload) return;

    upload.status = "pending";
    this.saveToStorage();

    supabase
      .from("upload_queue")
      .update({ status: "pending" })
      .eq("id", id)
      .then();

    this.notifyListeners();
  }

  // Remove from queue
  async removeFromQueue(id: string) {
    this.queue.delete(id);
    this.saveToStorage();

    await supabase.from("upload_queue").delete().eq("id", id);

    this.notifyListeners();
  }

  // Get all queued uploads
  getQueue(): QueuedUpload[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Get network quality
  getNetworkQuality(): NetworkQuality {
    return this.networkQuality;
  }

  // Subscribe to queue updates
  subscribe(listener: (queue: QueuedUpload[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach((listener) => listener(queue));
  }
}

export const uploadQueueManager = new UploadQueueManager();
