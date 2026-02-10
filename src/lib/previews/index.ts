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
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const PREVIEW_MAX_SIZE = 512;
const PREVIEW_QUALITY = 80;
const POSTER_TIMEOUT_MS = 45000;
// Video downloads (especially 1080p) can exceed 30s; previews run async, so we can afford a higher timeout.
const DOWNLOAD_TIMEOUT_MS = 120000;
const ANIMATED_PREVIEW_DURATION = 4; // seconds
const ANIMATED_PREVIEW_TIMEOUT_MS = 60000;

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

    // Stream to disk to avoid buffering large videos in memory.
    if (response.body) {
      // Node's fetch returns a Web ReadableStream; convert to Node stream.
      await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destPath));
    } else {
      // Fallback (should be rare).
      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    }
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

    return await generateVideoPosterFromLocalFile({
      videoPath: tempVideo,
      tempFramePath: tempFrame,
      userId,
      generationId,
      supabase,
    });
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

export async function generateVideoPosterFromLocalFile(params: {
  videoPath: string;
  tempFramePath?: string;
  userId: string;
  generationId: string;
  supabase: SupabaseClient;
}): Promise<{ path: string; publicUrl: string }> {
  const { videoPath, userId, generationId, supabase } = params;
  const tempFrame =
    params.tempFramePath || join(tmpdir(), `poster_frame_${generationId}_${Date.now()}.jpg`);

  try {
    console.log(`[Preview:video:${generationId}] step=ffmpeg extracting_thumbnail`);

    const runExtract = (mode: "thumbnail" | "seek", seekSeconds?: number) =>
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("FFmpeg timeout")), POSTER_TIMEOUT_MS);

        const cmd = ffmpeg(videoPath);
        if (mode === "thumbnail") {
          // "thumbnail" filter picks a representative frame and avoids black-first-frame issues.
          cmd.outputOptions(["-vf", "thumbnail", "-frames:v", "1", "-q:v", "2"]);
        } else {
          // Fallback: explicit seek.
          cmd.seekInput(Math.max(0, Number(seekSeconds || 0))).outputOptions(["-frames:v", "1", "-q:v", "2"]);
        }

        cmd.output(tempFrame)
          .on("end", () => {
            clearTimeout(timeout);
            resolve();
          })
          .on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          })
          .run();
      });

    // Try representative thumbnail first.
    await runExtract("thumbnail");

    // If the extracted frame is extremely dark, retry with a small seek.
    // This guards against videos that start with a black fade even beyond the thumbnail pick.
    try {
      const stats = await sharp(tempFrame).stats();
      const means = (stats.channels || []).map((c) => c.mean || 0);
      const avg = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 255;
      if (avg < 6) {
        console.log(`[Preview:video:${generationId}] step=ffmpeg retry_dark_frame avg=${avg.toFixed(1)}`);
        await runExtract("seek", 0.4);
      }
    } catch {
      // Non-fatal: proceed with whatever frame we got.
    }

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
      fs.unlink(videoPath).catch(() => {}),
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
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(tempFrame).catch(() => {}),
    ]);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Preview:video:${generationId}] step=error message=${message}`);
    throw new Error(`Video poster generation failed: ${message}`);
  }
}

/**
 * Generate animated preview for video (4 seconds MP4 loop)
 * 
 * @param videoUrl - URL of video file
 * @param userId - User ID for storage path
 * @param generationId - Generation ID for filename
 * @param supabase - Supabase client
 * @returns Storage path (e.g., "userId/previews/genId_preview.mp4")
 */
export async function generateVideoAnimatedPreview(params: {
  videoUrl: string;
  userId: string;
  generationId: string;
  supabase: SupabaseClient;
}): Promise<{ path: string; publicUrl: string }> {
  const { videoUrl, userId, generationId, supabase } = params;

  const tempVideo = join(tmpdir(), `preview_video_${generationId}_${Date.now()}.tmp`);
  const tempPreview = join(tmpdir(), `preview_animated_${generationId}_${Date.now()}.mp4`);

  try {
    console.log(`[AnimatedPreview:${generationId}] step=download url=${videoUrl.substring(0, 60)}...`);
    
    // Download video
    await downloadFile(videoUrl, tempVideo, supabase);

    console.log(`[AnimatedPreview:${generationId}] step=ffmpeg generating_mp4 duration=${ANIMATED_PREVIEW_DURATION}s`);
    
    // Generate 4-second MP4 preview (H.264 - universal support)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("FFmpeg timeout"));
      }, ANIMATED_PREVIEW_TIMEOUT_MS);

      ffmpeg(tempVideo)
        .setStartTime(0) // Start from beginning
        .setDuration(ANIMATED_PREVIEW_DURATION) // 4 seconds
        .size(`${PREVIEW_MAX_SIZE}x?`) // Scale to max width
        .videoCodec('libx264') // H.264 codec (universal support)
        .videoBitrate('500k') // Low bitrate for small file
        .fps(24) // 24 fps
        .outputOptions([
          '-preset ultrafast', // Fast encoding
          '-movflags +faststart', // Web optimization
          '-pix_fmt yuv420p', // Compatibility
        ])
        .noAudio() // Remove audio
        .output(tempPreview)
        .on('end', () => {
          clearTimeout(timeout);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        })
        .run();
    });

    console.log(`[AnimatedPreview:${generationId}] step=read_file`);
    
    // Read the generated file
    const previewBuffer = await fs.readFile(tempPreview);

    // Clean up temp files
    await Promise.all([
      fs.unlink(tempVideo).catch(() => {}),
      fs.unlink(tempPreview).catch(() => {}),
    ]);

    console.log(`[AnimatedPreview:${generationId}] step=upload size=${previewBuffer.byteLength} bytes`);
    
    // Upload to storage
    const storagePath = `${userId}/previews/${generationId}_preview.mp4`;
    await uploadToStorage(supabase, "generations", storagePath, previewBuffer, "video/mp4");

    // Get public URL
    const { data } = supabase.storage.from("generations").getPublicUrl(storagePath);

    console.log(`[AnimatedPreview:${generationId}] step=complete path=${storagePath}`);

    return {
      path: storagePath,
      publicUrl: data.publicUrl,
    };
  } catch (error) {
    // Clean up on error
    await Promise.all([
      fs.unlink(tempVideo).catch(() => {}),
      fs.unlink(tempPreview).catch(() => {}),
    ]);

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AnimatedPreview:${generationId}] step=error message=${message}`);
    throw new Error(`Video animated preview generation failed: ${message}`);
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
