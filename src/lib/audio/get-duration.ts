import { getMediaDurationFromUrl } from '@/lib/media/ffprobe-duration';

/**
 * Get audio duration from URL (server-side).
 * Uses ffprobe for accurate extraction and rounds up to the nearest whole second.
 */
export async function getAudioDurationFromUrl(url: string): Promise<number> {
  const durationSec = await getMediaDurationFromUrl(url);
  return Math.ceil(durationSec);
}

/**
 * Get audio duration from blob (client-side fallback for UI preview only).
 */
export async function getAudioDurationFromBlob(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);

      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.ceil(audio.duration);
        URL.revokeObjectURL(url);
        resolve(duration);
      });

      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      });

      audio.src = url;
      audio.load();
    } catch (error) {
      reject(error);
    }
  });
}

export function parseDurationFromMetadata(metadata: any): number | null {
  try {
    if (metadata?.duration) return Math.ceil(Number(metadata.duration));
    if (metadata?.duration_seconds) return Math.ceil(Number(metadata.duration_seconds));
    if (metadata?.length) return Math.ceil(Number(metadata.length));
    return null;
  } catch {
    return null;
  }
}

