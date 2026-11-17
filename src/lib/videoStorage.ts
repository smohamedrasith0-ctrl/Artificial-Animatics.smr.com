import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  OperationType,
  clampText,
  db,
  handleFirestoreError,
  sanitizeId,
} from './firebase';

export const FIRESTORE_VIDEO_PREFIX = 'firestore-video://';
export const MAX_GALLERY_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB max
const BASE64_CHUNK_SIZE = 460000; // < 500,000 rule limit

// In-memory Blob cache for instant replay without re-fetching chunks
const videoBlobCache = new Map<string, Blob>();

export function isFirestoreVideoUrl(url: string): boolean {
  return url.trim().startsWith(FIRESTORE_VIDEO_PREFIX);
}

export function extractFirestoreVideoId(url: string): string {
  return sanitizeId(url.trim().slice(FIRESTORE_VIDEO_PREFIX.length));
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:30';
  const totalSec = Math.round(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export async function extractVideoMetadataAndThumbnail(
  file: File
): Promise<{ durationLabel: string; thumbnailDataUrl: string | null }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('Unable to read selected video file.'));
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onErr);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onErr);
    });

    const durationLabel = formatDuration(video.duration);

    let thumbnailDataUrl: string | null = null;
    try {
      const seekTime = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.6, video.duration * 0.25)
        : 0;
      video.currentTime = seekTime;
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 900);
        const onSeeked = () => {
          clearTimeout(timer);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const captured = canvas.toDataURL('image/jpeg', 0.82);
          if (captured.length <= 380000) {
            thumbnailDataUrl = captured;
          }
        }
      }
    } catch {
      thumbnailDataUrl = null;
    }

    return { durationLabel, thumbnailDataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read video file from gallery.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Unsupported video encoding.'));
        return;
      }
      const header = dataUrl.slice(5, commaIdx);
      const mimeType = header.split(';')[0] || file.type || 'video/mp4';
      const base64 = dataUrl.slice(commaIdx + 1);
      resolve({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadGalleryVideoToFirestore(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    throw new Error('Please choose a valid video file (MP4, WebM, or MOV).');
  }
  if (file.size <= 0) {
    throw new Error('The selected video file is empty.');
  }
  if (file.size > MAX_GALLERY_VIDEO_BYTES) {
    throw new Error('Video exceeds the 20 MB gallery upload limit. Please select a smaller clip or paste a hosted MP4/YouTube URL.');
  }

  onProgress?.(5);
  const { base64, mimeType } = await readFileAsBase64(file);
  const totalChunks = Math.ceil(base64.length / BASE64_CHUNK_SIZE);
  if (totalChunks < 1 || totalChunks > 60) {
    throw new Error('Video payload exceeds storage chunk limits. Please select a video under 20 MB.');
  }

  const videoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const metaPath = `portfolioVideos/${videoId}`;
  const safeMime = clampText(mimeType || 'video/mp4', 60);
  const safeFileName = clampText(file.name || 'gallery-video.mp4', 160);

  try {
    await setDoc(doc(db, 'portfolioVideos', videoId), {
      mimeType: safeMime,
      fileName: safeFileName,
      totalChunks,
      totalBytes: file.size,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, metaPath);
  }

  onProgress?.(12);

  // Write chunks in batches of 8 docs to stay safely below Firestore batch payload caps
  const BATCH_SIZE = 8;
  for (let start = 0; start < totalChunks; start += BATCH_SIZE) {
    const end = Math.min(totalChunks, start + BATCH_SIZE);
    const batch = writeBatch(db);
    for (let idx = start; idx < end; idx++) {
      const slice = base64.slice(idx * BASE64_CHUNK_SIZE, (idx + 1) * BASE64_CHUNK_SIZE);
      batch.set(doc(db, 'portfolioVideos', videoId, 'chunks', String(idx)), {
        index: idx,
        data: slice,
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${metaPath}/chunks/${start}`);
    }
    const pct = 12 + Math.round((end / totalChunks) * 88);
    onProgress?.(Math.min(100, pct));
  }

  // Prime in-memory cache immediately so preview works without re-downloading
  videoBlobCache.set(videoId, file);
  return `${FIRESTORE_VIDEO_PREFIX}${videoId}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function loadFirestoreVideoObjectUrl(videoUrl: string): Promise<string> {
  const videoId = extractFirestoreVideoId(videoUrl);
  const cached = videoBlobCache.get(videoId);
  if (cached) {
    return URL.createObjectURL(cached);
  }

  const metaPath = `portfolioVideos/${videoId}`;
  let metaSnap;
  try {
    metaSnap = await getDoc(doc(db, 'portfolioVideos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, metaPath);
  }

  if (!metaSnap || !metaSnap.exists()) {
    throw new Error('Uploaded gallery video could not be found.');
  }

  const meta = metaSnap.data();
  const totalChunks = Number(meta.totalChunks) || 0;
  const mimeType = typeof meta.mimeType === 'string' ? meta.mimeType : 'video/mp4';

  const chunkRefs = Array.from({ length: totalChunks }, (_, idx) =>
    doc(db, 'portfolioVideos', videoId, 'chunks', String(idx))
  );

  let chunkSnaps;
  try {
    chunkSnaps = await Promise.all(chunkRefs.map((ref) => getDoc(ref)));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${metaPath}/chunks`);
  }

  const parts: string[] = [];
  for (let i = 0; i < chunkSnaps.length; i++) {
    const snap = chunkSnaps[i];
    if (!snap.exists()) {
      throw new Error(`Missing video segment ${i + 1} of ${totalChunks}.`);
    }
    parts.push(String(snap.data().data || ''));
  }

  const bytes = base64ToUint8Array(parts.join(''));
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  videoBlobCache.set(videoId, blob);
  return URL.createObjectURL(blob);
}

export async function deleteFirestoreVideo(videoUrl: string): Promise<void> {
  if (!isFirestoreVideoUrl(videoUrl)) return;
  const videoId = extractFirestoreVideoId(videoUrl);
  videoBlobCache.delete(videoId);

  const metaPath = `portfolioVideos/${videoId}`;
  let metaSnap;
  try {
    metaSnap = await getDoc(doc(db, 'portfolioVideos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, metaPath);
  }

  if (!metaSnap || !metaSnap.exists()) return;

  const totalChunks = Number(metaSnap.data().totalChunks) || 0;
  const BATCH_SIZE = 20;
  for (let start = 0; start < totalChunks; start += BATCH_SIZE) {
    const end = Math.min(totalChunks, start + BATCH_SIZE);
    const batch = writeBatch(db);
    for (let idx = start; idx < end; idx++) {
      batch.delete(doc(db, 'portfolioVideos', videoId, 'chunks', String(idx)));
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${metaPath}/chunks/${start}`);
    }
  }

  try {
    await deleteDoc(doc(db, 'portfolioVideos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, metaPath);
  }
}
