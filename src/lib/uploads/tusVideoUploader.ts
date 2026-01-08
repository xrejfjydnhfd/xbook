import * as tus from "tus-js-client";

export type TusUploaderCallbacks = {
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
  onSuccess: () => void;
  onError: (error: Error) => void;
};

export type TusUploaderParams = {
  file: File;
  endpoint: string;
  headers: Record<string, string>;
  chunkSize: number;
  metadata: Record<string, string>;
  callbacks: TusUploaderCallbacks;
};

/**
 * Creates and starts a TUS resumable upload.
 *
 * Why TUS?
 * - True byte-based progress (no fake percentages)
 * - Resumes after disconnect / tab refresh (fingerprint stored in localStorage)
 * - Upload uses Blob slicing (no full-file buffering in memory)
 * - Retries failed chunks automatically
 */
export async function startTusUpload({
  file,
  endpoint,
  headers,
  chunkSize,
  metadata,
  callbacks,
}: TusUploaderParams): Promise<tus.Upload> {
  const upload = new tus.Upload(file, {
    endpoint,
    headers,

    // Mandatory: chunk based uploading.
    // Keep it within 5MB–10MB as requested.
    chunkSize,

    retryDelays: [0, 2000, 5000, 10000, 20000],
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,

    metadata,

    onError: (err) => callbacks.onError(err instanceof Error ? err : new Error(String(err))),
    onProgress: (bytesUploaded, bytesTotal) => callbacks.onProgress(bytesUploaded, bytesTotal),
    onSuccess: () => callbacks.onSuccess(),
  });

  // Resume if there is a previous partial upload for this file.
  const previousUploads = await upload.findPreviousUploads();
  if (previousUploads.length > 0) {
    // Resume from the most recent upload.
    upload.resumeFromPreviousUpload(previousUploads[0]);
  }

  upload.start();
  return upload;
}
