/**
 * Chunk Integrity Checker
 * 
 * Provides SHA-256 checksums for upload chunks to ensure
 * data integrity during transfer.
 */

export interface ChunkWithHash {
  chunk: Blob;
  index: number;
  hash: string;
  startByte: number;
  endByte: number;
}

/**
 * Split a file into chunks and compute SHA-256 hash for each
 */
export async function splitFileIntoChunks(
  file: File,
  chunkSize: number
): Promise<ChunkWithHash[]> {
  const chunks: ChunkWithHash[] = [];
  let offset = 0;
  let index = 0;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);
    const hash = await computeChunkHash(chunk);

    chunks.push({
      chunk,
      index,
      hash,
      startByte: offset,
      endByte: end,
    });

    offset = end;
    index++;
  }

  return chunks;
}

/**
 * Compute SHA-256 hash of a blob
 */
export async function computeChunkHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute full file hash (for deduplication)
 */
export async function computeFileHash(file: File): Promise<string> {
  // For large files (>100MB), use sampling
  if (file.size > 100 * 1024 * 1024) {
    return computeSampledHash(file);
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * For very large files, compute hash from samples
 */
async function computeSampledHash(file: File): Promise<string> {
  const sampleSize = 1024 * 1024; // 1MB samples
  const numSamples = 5;
  const step = Math.floor(file.size / numSamples);

  const samples: ArrayBuffer[] = [];

  // Sample from different parts of the file
  for (let i = 0; i < numSamples; i++) {
    const start = i * step;
    const end = Math.min(start + sampleSize, file.size);
    const chunk = file.slice(start, end);
    samples.push(await chunk.arrayBuffer());
  }

  // Include file size in hash
  const sizeBuffer = new TextEncoder().encode(file.size.toString());
  samples.push(sizeBuffer.buffer);

  // Combine all samples
  const totalLength = samples.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of samples) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify chunk integrity after upload by comparing hashes
 */
export function verifyChunkIntegrity(
  originalHash: string,
  receivedHash: string
): boolean {
  return originalHash === receivedHash;
}
