/**
 * Get audio duration from URL or blob
 * Returns duration in seconds (rounded up to nearest integer)
 */

/**
 * Get audio duration from URL (server-side)
 * Downloads audio metadata and extracts duration
 */
export async function getAudioDurationFromUrl(url: string): Promise<number> {
  try {
    // Fetch audio file (only headers to get content info)
    const response = await fetch(url, {
      method: 'HEAD',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    // Try to get duration from content headers (if available)
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    console.log('[Audio Duration] Headers:', {
      contentLength,
      contentType,
      url: url.substring(0, 100),
    });

    // If we can't get duration from headers, we need to actually download and decode the audio
    // This is more reliable but requires fetching the full file
    return await getAudioDurationFromUrlFull(url);
  } catch (error) {
    console.error('[Audio Duration] Error:', error);
    throw error;
  }
}

/**
 * Get audio duration by fully downloading the file (server-side)
 * More reliable but slower
 */
async function getAudioDurationFromUrlFull(url: string): Promise<number> {
  try {
    // For server-side, we need to use a library like music-metadata or ffprobe
    // For now, we'll use a simpler approach with Web Audio API (if available)
    // Or return a default estimate based on file size
    
    // Fetch the full audio file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Try to decode with Web Audio API (if available in Node.js context)
    // Note: This won't work in standard Node.js, need to use a library
    
    // For MVP: estimate duration based on file size
    // Average MP3 bitrate: 128 kbps = 16 KB/s
    const fileSizeKB = arrayBuffer.byteLength / 1024;
    const estimatedDuration = Math.ceil(fileSizeKB / 16);
    
    console.log('[Audio Duration] Estimated from file size:', {
      fileSizeKB,
      estimatedDuration,
    });
    
    return estimatedDuration;
  } catch (error) {
    console.error('[Audio Duration] Full fetch error:', error);
    throw error;
  }
}

/**
 * Get audio duration from blob (client-side)
 * Uses Web Audio API to decode and get precise duration
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

/**
 * Get audio duration using ffprobe (server-side, most reliable)
 * Requires ffmpeg/ffprobe installed
 */
export async function getAudioDurationWithFFProbe(filePath: string): Promise<number> {
  try {
    // This would require child_process and ffprobe
    // For now, return null to indicate it's not implemented
    throw new Error('ffprobe not implemented yet');
  } catch (error) {
    console.error('[Audio Duration] ffprobe error:', error);
    throw error;
  }
}

/**
 * Parse duration from ElevenLabs API response
 * ElevenLabs might return duration in metadata
 */
export function parseDurationFromMetadata(metadata: any): number | null {
  try {
    // Check common fields where duration might be stored
    if (metadata?.duration) {
      return Math.ceil(Number(metadata.duration));
    }
    if (metadata?.duration_seconds) {
      return Math.ceil(Number(metadata.duration_seconds));
    }
    if (metadata?.length) {
      return Math.ceil(Number(metadata.length));
    }
    return null;
  } catch {
    return null;
  }
}
