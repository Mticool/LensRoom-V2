/**
 * Preview Generation Module
 * 
 * Generates optimized previews for photos and posters for videos.
 * Stores results in Supabase Storage as storage paths (not URLs).
 * 
 * Requirements:
 * - Photos: Lightweight webp preview (512px max width/height)
 * - Videos: Poster image extracted from first frame (webp, 512px)
 * - Never crash the request: log errors and mark preview_status=failed
 * - Idempotent: skip if preview/poster already exists
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream, createReadStream, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const PREVIEW_MAX_SIZE = 512;
const PREVIEW_QUALITY = 80;
const POSTER_TIMEOUT_MS = 45000;
const DOWNLOAD_TIMEOUT_MS = 30000;

/**
 * Download a file from URL with timeout
 * Handles both public URLs and creates signed URLs for private storage
 */
async function downloadFile(
  url: string,
  destPath: string,
  supabase?: any
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    // Try direct download first
    let response = await fetch(url, { signal: controller.signal });
    
    // If 400/403 and it's a Supabase storage URL, try signed URL
    if (!response.ok && (response.status === 400 || response.status === 403)) {
      if (url.includes('/storage/v1/object/public/') && supabase) {
        // Extract path: /storage/v1/object/public/generations/path/to/file.png
        const match = url.match(/\/storage\/v1\/object\/public\/generations\/(.+)$/);
        if (match) {
          const storagePath = match[1]; // path after bucket name
          console.log(`[Download] Public URL failed (${response.status}), trying signed URL for: ${storagePath.substring(0, 50)}...`);
          
          const { data: signedData, error: signError } = await supabase.storage
            .from('generations')
            .createSignedUrl(storagePath, 300); // 5 min TTL
          
          if (!signError && signedData?.signedUrl) {
            console.log(`[Download] Retrying with signed URL`);
            response = await fetch(signedData.signedUrl, { signal: controller.signal });
          }
        }
      }
    }
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Upload buffer to Supabase Storage and return storage path
 */
async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return storagePath;
}

/**
 * Generate optimized webp preview for photo
 * 
 * @param sourceUrl - URL of original image (from KIE or external source)
 * @param userId - User ID for storage path
 * @param generationId - Generation ID for filename
 * @param supabase - Supabase client
 * @returns Storage path (e.g., "userId/previews/genId_preview.webp")
 */
export async function generateImagePreview(params: {
  sourceUrl: string;
  userId: string;
  generationId: string;
  supabase: SupabaseClient;
}): Promise<{ path: string; publicUrl: string }> {
  const { sourceUrl, userId, generationId, supabase } = params;

  try {
    console.log(`[Preview:photo:${generationId}] step=download url=${sourceUrl.substring(0, 60)}...`);
    
    // Download original image (auto-fallback to signed URL if public fails)
    const tempInput = join(tmpdir(), `preview_in_${generationId}_${Date.now()}.tmp`);
    await downloadFile(sourceUrl, tempInput, supabase);

    console.log(`[Preview:photo:${generationId}] step=resize target=${PREVIEW_MAX_SIZE}px`);
    
    // Resize and convert to webp
    const webpBuffer = await sharp(tempInput)
      .resize(PREVIEW_MAX_SIZE, PREVIEW_MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PREVIEW_QUALITY })
      .toBuffer();

    // Clean up temp file
    await fs.unlink(tempInput).catch(() => {});

    console.log(`[Preview:photo:${generationId}] step=upload size=${webpBuffer.byteLength} bytes`);
    
    // Upload to storage
    const storagePath = `${userId}/previews/${generationId}_preview.webp`;
    await uploadToStorage(supabase, "generations", storagePath, webpBuffer, "image/webp");

    // Get public URL
    const { data } = supabase.storage.from("generations").getPublicUrl(storagePath);

    console.log(`[Preview:photo:${generationId}] step=complete path=${storagePath}`);

    return {
      path: storagePath,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Preview:photo:${generationId}] step=error message=${message}`);
    throw new Error(`Image preview generation failed: ${message}`);
  }
}

/**
 * Extract poster frame from video using ffmpeg
 * 
 * @param videoUrl - URL of video file
 * @param userId - User ID for storage path
 * @param generationId - Generation ID for filename
 * @param supabase - Supabase client
 * @returns Storage path (e.g., "userId/posters/genId_poster.webp")
 */
export async function generateVideoPoster(params: {
  videoUrl: string;
  userId: string;
  generationId: string;
  supabase: SupabaseClient;
}): Promise<{ path: string; publicUrl: string }> {
  const { videoUrl, userId, generationId, supabase } = params;

  const tempVideo = join(tmpdir(), `poster_video_${generationId}_${Date.now()}.tmp`);
  const tempFrame = join(tmpdir(), `poster_frame_${generationId}_${Date.now()}.jpg`);

  try {
    console.log(`[Preview:video:${generationId}] step=download url=${videoUrl.substring(0, 60)}...`);
    
    // Download video (auto-fallback to signed URL if public fails)
    await downloadFile(videoUrl, tempVideo, supabase);

    console.log(`[Preview:video:${generationId}] step=ffmpeg extracting_frame at=1s`);
    
    // Extract frame at 1 second using ffmpeg
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("FFmpeg timeout"));
      }, POSTER_TIMEOUT_MS);

      ffmpeg(tempVideo)
        .screenshots({
          timestamps: [1],
          filename: tempFrame.split("/").pop()!,
          folder: tmpdir(),
          size: `${PREVIEW_MAX_SIZE}x?`,
        })
        .on("end", () => {
          clearTimeout(timeout);
          resolve();
        })
        .on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });

    console.log(`[Preview:video:${generationId}] step=sharp converting_to_webp`);
    
    // Convert to webp using sharp
    const webpBuffer = await sharp(tempFrame)
      .resize(PREVIEW_MAX_SIZE, PREVIEW_MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: PREVIEW_QUALITY })
      .toBuffer();

    // Clean up temp files
    await Promise.all([
      fs.unlink(tempVideo).catch(() => {}),
      fs.unlink(tempFrame).catch(() => {}),
    ]);

    console.log(`[Preview:video:${generationId}] step=upload size=${webpBuffer.byteLength} bytes`);
    
    // Upload to storage
    const storagePath = `${userId}/posters/${generationId}_poster.webp`;
    await uploadToStorage(supabase, "generations", storagePath, webpBuffer, "image/webp");

    // Get public URL
    const { data } = supabase.storage.from("generations").getPublicUrl(storagePath);

    console.log(`[Preview:video:${generationId}] step=complete path=${storagePath}`);

    return {
      path: storagePath,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    // Clean up on error
    await Promise.all([
      fs.unlink(tempVideo).catch(() => {}),
      fs.unlink(tempFrame).catch(() => {}),
    ]);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Preview:video:${generationId}] step=error message=${message}`);
    throw new Error(`Video poster generation failed: ${message}`);
  }
}

/**
 * Check if preview/poster already exists in storage
 */
export async function previewExists(params: {
  supabase: SupabaseClient;
  bucket: string;
  storagePath: string;
}): Promise<boolean> {
  const { supabase, bucket, storagePath } = params;

  try {
    const { data, error } = await supabase.storage.from(bucket).list(
      storagePath.split("/").slice(0, -1).join("/"), // parent directory
      {
        limit: 1,
        search: storagePath.split("/").pop(), // filename
      }
    );

    return !error && Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

