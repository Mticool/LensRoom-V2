// ===== VIDEO API CLIENT =====
// Internal API client for video generation services

import { env } from "@/lib/env";
import { fetchWithTimeout } from './fetch-with-timeout';

// ===== MODEL IDS =====

export const LAOZHANG_MODELS = {
  // === IMAGE MODELS ===
  // Nano Banana (Flash - fast generation)
  NANO_BANANA: "gemini-2.5-flash-image-preview",

  // Nano Banana Pro (Quality generation)
  NANO_BANANA_PRO: "gemini-3-pro-image-preview",
  NANO_BANANA_PRO_2K: "gemini-3-pro-image-preview-2k",
  NANO_BANANA_PRO_4K: "gemini-3-pro-image-preview-4k",

  // Seedream alternatives (cheap)
  SEEDREAM_4_0: "seedream-4-0-250828",
  SEEDREAM_4_5: "seedream-4-5-251128",

  // === VIDEO MODELS - VEO 3.1 ===
  // Standard models (720p)
  VEO_31: "veo-3.1",
  VEO_31_FAST: "veo-3.1-fast",
  VEO_31_RELAXED: "veo-3.1-relaxed",
  VEO_31_LANDSCAPE: "veo-3.1-landscape",
  VEO_31_LANDSCAPE_FAST: "veo-3.1-landscape-fast",
  VEO_31_LANDSCAPE_RELAXED: "veo-3.1-landscape-relaxed",

  // HD models (1080p) - requires aspect_ratio: "16:9", duration: 8
  VEO_31_LANDSCAPE_HD: "veo-3.1-landscape-hd",
  VEO_31_LANDSCAPE_FAST_HD: "veo-3.1-landscape-fast-hd",
  VEO_31_LANDSCAPE_RELAXED_HD: "veo-3.1-landscape-relaxed-hd",

  // 4K models (higher resolution)
  VEO_31_FAST_4K: "veo-3.1-fast-4k",
  VEO_31_LANDSCAPE_FAST_4K: "veo-3.1-landscape-fast-4k",

  // Multiple reference images support (-fl suffix)
  // NOTE: Works with standard veo-3.1, also with HD models
  VEO_31_FL: "veo-3.1-fl",
  VEO_31_LANDSCAPE_FL: "veo-3.1-landscape-fl",
  VEO_31_LANDSCAPE_FL_HD: "veo-3.1-landscape-fl-hd",
  VEO_31_LANDSCAPE_FAST_FL_HD: "veo-3.1-landscape-fast-fl-hd",
  VEO_31_LANDSCAPE_RELAXED_FL_HD: "veo-3.1-landscape-relaxed-fl-hd",

  // === VIDEO MODELS - SORA ===
  SORA_2: "sora-2",
  SORA_VIDEO2: "sora_video2",
  SORA_VIDEO2_15S: "sora_video2-15s",
  SORA_VIDEO2_LANDSCAPE: "sora_video2-landscape",
} as const;

/**
 * When API returns "token does not have permission to use model" for a -fast-fl model,
 * retry with the standard -fl model (same refs support, different billing tier).
 */
function getFallbackModelForPermissionError(model: string): string | null {
  if (model === 'veo-3.1-fast-fl') return LAOZHANG_MODELS.VEO_31_FL;
  if (model === 'veo-3.1-landscape-fast-fl') return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FL;
  if (model.endsWith('-fast-fl')) return model.replace(/-fast-fl$/, '-fl');
  return null;
}

/**
 * When token has no access to any -fl model, try image2video with base model and first ref only.
 * Returns { model, startImageUrl } or null.
 */
function getFallbackNoFlModel(
  model: string,
  referenceImages: string[]
): { model: string; startImageUrl: string } | null {
  if (!referenceImages.length) return null;
  const firstRef = referenceImages[0];
  if (!firstRef?.startsWith('data:image/') && !firstRef?.startsWith('http')) return null;
  if (model.includes('landscape')) return { model: LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST, startImageUrl: firstRef };
  return { model: LAOZHANG_MODELS.VEO_31_FAST, startImageUrl: firstRef };
}

// ===== TYPES =====

export interface LaoZhangImageRequest {
  model: string;
  prompt: string;
  n?: number; // Number of images (default 1)
  size?: string; // e.g., "1024x1024", "1024x1536", "1536x1024"
  aspect_ratio?: string; // e.g., "1:1", "9:16", "16:9" (for models that require it)
  quality?: "standard" | "hd"; // For some models
  response_format?: "url" | "b64_json";
}

export interface LaoZhangImageEditRequest {
  model: string;
  prompt: string;
  image: string; // URL or base64
  mask?: string; // Optional mask for inpainting
  n?: number;
  size?: string;
  aspect_ratio?: string; // e.g., "1:1", "9:16", "16:9" (for models that require it)
  response_format?: "url" | "b64_json";
}

export interface LaoZhangImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface LaoZhangError {
  error: {
    message: string;
    type: string;
    param?: string | null;
    code?: string | null;
  };
}

// Video generation response (sync - chat/completions)
export interface LaoZhangVideoResponse {
  id: string;
  videoUrl: string;
  model: string;
  created: number;
}

// Video generation task response (async - video/generations)
export interface LaoZhangVideoTaskResponse {
  id: string;
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  seconds?: string;
  size?: string;
  created_at?: number;
  video_url?: string;
}

// ===== ASPECT RATIO MAPPING =====

// Map our aspect ratios to pixel sizes
export function aspectRatioToLaoZhangSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case "9:16":
    case "2:3":
      return "1024x1536"; // Portrait
    case "16:9":
    case "3:2":
      return "1536x1024"; // Landscape
    case "4:3":
      return "1280x960";
    case "3:4":
      return "960x1280";
    case "4:5":
    case "5:6":
      // Portrait-ish mid ratios
      return "1024x1280";
    case "5:4":
    case "6:5":
      // Landscape-ish mid ratios
      return "1280x1024";
    case "21:9":
    case "2:1":
      // Super-wide
      return "1536x768";
    case "1:2":
      // Super-tall
      return "768x1536";
    case "9:21":
      // Extra-tall
      return "768x1792";
    case "1:1":
    default:
      // If it's a numeric ratio (e.g. "21:9"), compute a sane size.
      if (/^\d+\s*:\s*\d+$/.test(String(aspectRatio || "").trim())) {
        return resolutionToLaoZhangSize("1k", aspectRatio);
      }
      return "1024x1024"; // Square / fallback
  }
}

// Map resolution tier to size
export function resolutionToLaoZhangSize(
  resolution: string,
  aspectRatio: string
): string {
  const aspect = aspectRatio || "1:1";

  // Calculate base dimensions for aspect ratio.
  // Prefer explicit numeric ratio parsing (supports 4:5, 21:9, etc).
  const parsed = String(aspect || "").trim().match(/^(\d+)\s*:\s*(\d+)$/);
  const w = parsed ? Number(parsed[1]) : 1;
  const h = parsed ? Number(parsed[2]) : 1;
  const safeW = Number.isFinite(w) && w > 0 ? w : 1;
  const safeH = Number.isFinite(h) && h > 0 ? h : 1;
  const base = 1024;
  const isPortrait = safeH > safeW;

  // Resolution multipliers
  const multipliers: Record<string, number> = {
    "1k": 1,
    "1k_2k": 2, // Map to 2K tier to keep sizes standard for LaoZhang/Gemini
    "2k": 2,
    "4k": 4,
  };

  const mult = multipliers[resolution.toLowerCase()] || 1;
  const scaledBase = base * mult;

  // Calculate dimensions maintaining aspect ratio
  let width: number, height: number;
  if (isPortrait) {
    height = Math.round(scaledBase);
    width = Math.round((scaledBase * safeW) / safeH);
  } else {
    width = Math.round(scaledBase);
    height = Math.round((scaledBase * safeH) / safeW);
  }

  // Round to nearest 64 (required by some models)
  width = Math.round(width / 64) * 64;
  height = Math.round(height / 64) * 64;

  // Clamp to reasonable limits
  width = Math.min(Math.max(width, 512), 4096);
  height = Math.min(Math.max(height, 512), 4096);

  return `${width}x${height}`;
}

// ===== API CLIENT =====
//
// LaoZhang = OpenAI-compatible API: same chat/completions format, only base_url and API key differ.
// - base_url: https://api.laozhang.ai/v1 (not openai.com)
// - Auth: Authorization: Bearer LAOZHANG_API_KEY
// - Video: POST /v1/chat/completions with model (e.g. veo-3.1-fl, sora_video2)
// - Images in content: type "image_url", image_url.url = data:image/...;base64,... or https://...
//   No need to upload to our storage when client sends data URL — pass it as-is in image_url.url.

export class LaoZhangClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    const key = apiKey || env.optional("LAOZHANG_API_KEY");
    if (!key) {
      throw new Error(
        "Сервис генерации видео временно недоступен. Попробуйте позже."
      );
    }
    this.apiKey = key;
    this.baseUrl = "https://api.laozhang.ai/v1";
  }

  /**
   * Generate images using Nano Banana / Nano Banana Pro
   * POST /v1/images/generations
   */
  async generateImage(
    request: LaoZhangImageRequest
  ): Promise<LaoZhangImageResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      n: request.n || 1,
    };

    if (request.size) {
      body.size = request.size;
    }
    if (request.aspect_ratio) {
      body.aspect_ratio = request.aspect_ratio;
    }
    if (request.quality) {
      body.quality = request.quality;
    }
    if (request.response_format) {
      body.response_format = request.response_format;
    }

    console.log("[Video API] Request:", JSON.stringify(body));

    const response = await fetchWithTimeout(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 120000, // 120s for image generation
    });

    const responseText = await response.text();
    console.log("[Video API] Response status:", response.status);
    console.log(
      "[Video API] Response preview:",
      responseText.substring(0, 500)
    );

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error: LaoZhangError = JSON.parse(responseText);
        errorMessage = error.error?.message || response.statusText;
      } catch {
        errorMessage = responseText || response.statusText;
      }
      throw new Error(`Video API error: ${errorMessage}`);
    }

    try {
      const result = JSON.parse(responseText);
      console.log("[Video API] Parsed response:", {
        created: result.created,
        dataLength: result.data?.length,
        hasUrl: !!result.data?.[0]?.url,
        hasB64: !!result.data?.[0]?.b64_json,
      });
      return result;
    } catch (parseErr) {
      console.error("[Video API] Failed to parse response:", parseErr);
      throw new Error(
        `Video API returned invalid JSON: ${responseText.substring(0, 200)}`
      );
    }
  }

  /**
   * Edit images using Nano Banana Edit / Nano Banana Pro Edit
   * POST /v1/images/edits (requires multipart/form-data)
   */
  async editImage(
    request: LaoZhangImageEditRequest
  ): Promise<LaoZhangImageResponse> {
    console.log("[Video API Edit] Request:", {
      model: request.model,
      prompt: request.prompt.substring(0, 50),
      hasImage: !!request.image,
      hasMask: !!request.mask,
    });

    // Create FormData for multipart request
    const formData = new FormData();
    formData.append("model", request.model);
    formData.append("prompt", request.prompt);
    formData.append("n", String(request.n || 1));
    
    if (request.size) {
      formData.append("size", request.size);
    }
    if (request.aspect_ratio) {
      formData.append("aspect_ratio", request.aspect_ratio);
    }
    if (request.response_format) {
      formData.append("response_format", request.response_format);
    }
    
    // Handle image - could be URL or base64
    if (request.image) {
      if (request.image.startsWith("data:")) {
        // Base64 data URL - convert to blob
        const base64Data = request.image.split(",")[1];
        const mimeType = request.image.split(";")[0].split(":")[1] || "image/png";
        const imageBuffer = Buffer.from(base64Data, "base64");
        const blob = new Blob([imageBuffer], { type: mimeType });
        formData.append("image", blob, "image.png");
      } else if (request.image.startsWith("http")) {
        // URL - fetch and convert to blob
        try {
          const imageResponse = await fetchWithTimeout(request.image, { timeout: 30000 });
          const imageBlob = await imageResponse.blob();
          formData.append("image", imageBlob, "image.png");
        } catch (fetchError) {
          console.error("[Video API Edit] Failed to fetch image URL:", fetchError);
          throw new Error("Failed to fetch reference image");
        }
      } else {
        // Assume raw base64
        const imageBuffer = Buffer.from(request.image, "base64");
        const blob = new Blob([imageBuffer], { type: "image/png" });
        formData.append("image", blob, "image.png");
      }
    }
    
    if (request.mask) {
      // Handle mask similarly
      if (request.mask.startsWith("data:")) {
        const base64Data = request.mask.split(",")[1];
        const maskBuffer = Buffer.from(base64Data, "base64");
        const blob = new Blob([maskBuffer], { type: "image/png" });
        formData.append("mask", blob, "mask.png");
      } else {
        const maskBuffer = Buffer.from(request.mask, "base64");
        const blob = new Blob([maskBuffer], { type: "image/png" });
        formData.append("mask", blob, "mask.png");
      }
    }

    const response = await fetchWithTimeout(`${this.baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        // Don't set Content-Type - let fetch set it with boundary for FormData
      },
      body: formData,
      timeout: 120000, // 120s for image editing
    });

    const responseText = await response.text();
    console.log("[Video API Edit] Response status:", response.status);
    console.log("[Video API Edit] Response preview:", responseText.substring(0, 500));

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error: LaoZhangError = JSON.parse(responseText);
        errorMessage = error.error?.message || response.statusText;
      } catch {
        errorMessage = responseText || response.statusText;
      }
      throw new Error(`Video API Edit error: ${errorMessage}`);
    }

    return JSON.parse(responseText);
  }

  /**
   * Generate video using Veo / Sora models
   *
   * IMPORTANT: Veo 3.1 Reference Images mode:
   * - Reference images require -fl suffix (e.g., veo-3.1-landscape-fl or veo-3.1-landscape-fl-hd)
   * - Fast models CAN use reference images with -fast-fl suffix
   * - HD models with refs use -fl-hd or -fast-fl-hd suffix
   *
   * Model suffix mapping for reference images:
   * - veo-3.1-landscape -> veo-3.1-landscape-fl
   * - veo-3.1-landscape-fast -> veo-3.1-landscape-fast-fl
   * - veo-3.1-landscape-hd -> veo-3.1-landscape-fl-hd
   * - veo-3.1-landscape-fast-hd -> veo-3.1-landscape-fast-fl-hd
   *
   * Supports: t2v (text only), i2v (single image), start_end (first + last frame)
   */
  async generateVideo(params: {
    model: string;
    prompt: string;
    startImageUrl?: string; // First frame image URL (for i2v)
    endImageUrl?: string; // Last frame image URL (for start_end mode)
    referenceImages?: string[]; // Reference images (up to 3)
  }): Promise<LaoZhangVideoResponse> {
    const hasReferenceImages = params.referenceImages && params.referenceImages.length > 0;
    const isHDModel = params.model.includes('-hd');
    const alreadyHasFL = params.model.includes('-fl');

    // Add -fl suffix for reference images if not already present
    if (hasReferenceImages && !alreadyHasFL) {
      let modelWithFL = params.model;

      if (isHDModel) {
        // For HD models: add -fl before -hd
        // veo-3.1-landscape-hd -> veo-3.1-landscape-fl-hd
        // veo-3.1-landscape-fast-hd -> veo-3.1-landscape-fast-fl-hd
        modelWithFL = params.model.replace('-hd', '-fl-hd');
      } else {
        // For non-HD models: add -fl at the end
        modelWithFL = `${params.model}-fl`;
      }

      console.log('[Video API] Adding -fl suffix for reference images:', {
        original: params.model,
        withFL: modelWithFL,
        isHD: isHDModel,
        referenceCount: params.referenceImages?.length,
      });

      params.model = modelWithFL;
    }

    // IMPORTANT: Always use chat/completions format for Veo
    // The /video/generations endpoint is async-only (returns taskId, not URL)
    // chat/completions returns URL directly in response
    try {
      return await this.generateVideoChatFormat(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isPermissionError =
        msg.includes('无权使用模型') ||
        msg.includes('该令牌无权使用模型') ||
        /token.*(?:does not have|has no).*permission/i.test(msg) ||
        /permission.*model|model.*permission/i.test(msg) ||
        (msg.includes('permission') && msg.includes('model'));
      const fallbackModel = getFallbackModelForPermissionError(params.model);
      if (
        isPermissionError &&
        fallbackModel &&
        params.referenceImages &&
        params.referenceImages.length > 0
      ) {
        console.log('[Video API] Retrying with', fallbackModel, '(token may not have', params.model + ')');
        try {
          return await this.generateVideoChatFormat({ ...params, model: fallbackModel });
        } catch (err2: unknown) {
          const msg2 = err2 instanceof Error ? err2.message : String(err2);
          const isPermissionError2 =
            msg2.includes('无权使用模型') ||
            msg2.includes('该令牌无权使用模型') ||
            /token.*(?:does not have|has no).*permission/i.test(msg2) ||
            (msg2.includes('permission') && msg2.includes('model'));
          const noFlFallback = getFallbackNoFlModel(params.model, params.referenceImages);
          if (isPermissionError2 && noFlFallback) {
            console.log('[Video API] Token has no -fl access; trying image2video with', noFlFallback.model, '(first ref only)');
            return await this.generateVideoChatFormat({
              model: noFlFallback.model,
              prompt: params.prompt,
              startImageUrl: noFlFallback.startImageUrl,
              referenceImages: [],
            });
          }
          throw err2;
        }
      }
      const noFlFallback = getFallbackNoFlModel(params.model, params.referenceImages ?? []);
      if (isPermissionError && noFlFallback && params.referenceImages?.length) {
        console.log('[Video API] Token may not have -fl; trying image2video with', noFlFallback.model, '(first ref only)');
        try {
          return await this.generateVideoChatFormat({
            model: noFlFallback.model,
            prompt: params.prompt,
            startImageUrl: noFlFallback.startImageUrl,
            referenceImages: [],
          });
        } catch {
          throw err;
        }
      }
      throw err;
    }
  }

  /**
   * Generate video using Veo Video API format (action-based)
   * POST /v1/video/generations or similar
   */
  private async generateVideoVeoFormat(params: {
    model: string;
    prompt: string;
    startImageUrl?: string;
    endImageUrl?: string;
    referenceImages?: string[];
  }): Promise<LaoZhangVideoResponse> {
    const hasReferenceImages = params.referenceImages && params.referenceImages.length > 0;
    const hasStartImage = !!params.startImageUrl;
    const isFastModel = params.model.includes('fast');
    
    let action: 'text2video' | 'image2video' = 'text2video';
    let imageUrls: string[] | undefined;
    let finalModel = params.model;
    
    // Determine action and model based on inputs
    if (hasReferenceImages && !isFastModel) {
      // Multiple references - standard veo-3.1 with -fl suffix
      action = 'text2video'; // Still text2video but with -fl model
      finalModel = params.model.includes('-fl') ? params.model : `${params.model}-fl`;
      
      console.log('[Video API] Using standard Veo with multiple references:', {
        model: finalModel,
        referenceCount: params.referenceImages?.length || 0,
      });
      
      // For -fl models, we might need chat/completions format instead
      return this.generateVideoChatFormat({
        ...params,
        model: finalModel,
      });
    } else if (hasStartImage) {
      // Single first frame - image2video
      action = 'image2video';
      imageUrls = [params.startImageUrl!];
      
      console.log('[Video API] Using image2video with first frame:', {
        model: params.model,
        hasImage: true,
      });
    } else {
      // Text only - text2video
      action = 'text2video';
      
      console.log('[Video API] Using text2video:', {
        model: params.model,
      });
    }
    
    // Build request body
    const body: Record<string, unknown> = {
      model: finalModel,
      prompt: params.prompt,
      action,
    };
    
    if (imageUrls) {
      body.image_urls = imageUrls;
    }
    
    console.log("[Video API] Veo Video API Request:", JSON.stringify(body, null, 2));
    
    const response = await fetchWithTimeout(`${this.baseUrl}/video/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 120000,
    });

    const responseText = await response.text();
    console.log("[Video API] Response status:", response.status);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error: LaoZhangError = JSON.parse(responseText);
        errorMessage = error.error?.message || response.statusText;
      } catch {
        errorMessage = responseText || response.statusText;
      }
      throw new Error(`Video API error: ${errorMessage}`);
    }

    const result = JSON.parse(responseText);
    
    // Handle async response - need polling but we don't support it yet
    if (result.id && !result.videoUrl && !result.video_url && !result.url) {
      console.error('[Video API] Async response received, task ID:', result.id);
      console.error('[Video API] Async mode not supported - video not ready immediately');
      throw new Error('Video generation is processing asynchronously. Please try again in a few minutes.');
    }
    
    // Extract video URL from response
    const videoUrl = result.videoUrl || result.video_url || result.url;
    if (!videoUrl) {
      console.error("[Video API] No video URL in response:", result);
      throw new Error("No video URL in response");
    }

    return {
      id: result.id || result.task_id || String(Date.now()),
      videoUrl,
      model: finalModel,
      created: result.created || Date.now() / 1000,
    };
  }

  /**
   * Veo 3.1: same as generic LaoZhang — POST /v1/chat/completions.
   * - Model: "veo-3.1" (text-only) or "veo-3.1-fl" (with refs); structure is the same.
   * - Content: [ { type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }, ... ].
   * - dataUrl must be data:image/<png|jpeg>;base64,<BASE64> or HTTP URL.
   * Sora and other video models use the same format.
   */
  private async generateVideoChatFormat(params: {
    model: string;
    prompt: string;
    startImageUrl?: string;
    endImageUrl?: string;
    referenceImages?: string[];
  }): Promise<LaoZhangVideoResponse> {
    const hasReferenceImages = params.referenceImages && params.referenceImages.length > 0;
    const hasStartImage = !!params.startImageUrl;
    const hasEndImage = !!params.endImageUrl;
    
    // Build message content
    let messageContent: string | { type: string; text?: string; image_url?: { url: string } }[];
    
    if (hasReferenceImages) {
      // Multiple ref images mode (only for standard veo-3.1 with -fl)
      const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: "text", text: params.prompt }
      ];
      
      for (const refImageBase64 of params.referenceImages!) {
        if (!refImageBase64.startsWith('data:image/') && !refImageBase64.startsWith('http')) {
          console.warn('[Video API] Invalid image format, skipping');
          continue;
        }
        contentParts.push({
          type: "image_url",
          image_url: { url: refImageBase64 }
        });
      }
      
      messageContent = contentParts;
      console.log("[Video API] Chat format - multiple references:", {
        model: params.model,
        referenceCount: params.referenceImages?.length || 0,
      });
    } else if (hasStartImage || hasEndImage) {
      // Single first frame (image2video for fast models) or start/end frame mode
      const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: "text", text: params.prompt }
      ];
      
      if (hasStartImage) {
        contentParts.push({
          type: "image_url",
          image_url: { url: params.startImageUrl! }
        });
      }
      
      if (hasEndImage) {
        contentParts.push({
          type: "text",
          text: "This is the desired end frame:"
        });
        contentParts.push({
          type: "image_url",
          image_url: { url: params.endImageUrl! }
        });
      }
      
      messageContent = contentParts;
      console.log("[Video API] Chat format - image2video:", {
        model: params.model,
        hasStartImage,
        hasEndImage,
      });
    } else {
      // Text only (text2video)
      messageContent = params.prompt;
      console.log("[Video API] Chat format - text2video:", {
        model: params.model,
      });
    }
    
    const body = {
      model: params.model,
      messages: [
        { role: "user", content: messageContent }
      ],
    };

    console.log("[Video API] Chat/completions Request:", JSON.stringify({
      model: params.model,
      hasImages: Array.isArray(messageContent),
      imageCount: Array.isArray(messageContent) ? messageContent.filter((m: any) => m.type === 'image_url').length : 0,
    }, null, 2));

    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 120000, // 2 minutes for video generation
    });

    const responseText = await response.text();
    console.log("[Video API] Response status:", response.status);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error: LaoZhangError = JSON.parse(responseText);
        errorMessage = error.error?.message || response.statusText;
      } catch {
        errorMessage = responseText || response.statusText;
      }
      throw new Error(`Video API error: ${errorMessage}`);
    }

    const result = JSON.parse(responseText);
    
    // Extract video URL from markdown format: [download video](URL)
    const content = result.choices?.[0]?.message?.content || "";
    const urlMatch = content.match(/\[download video\]\((https?:\/\/[^)]+)\)/);
    const videoUrl = urlMatch ? urlMatch[1] : null;

    if (!videoUrl) {
      console.error("[Video API] No video URL found in response:", content);
      throw new Error("No video URL in response");
    }

    console.log("[Video API] Got video URL:", videoUrl);

    return {
      id: result.id,
      videoUrl,
      model: result.model,
      created: result.created,
    };
  }

  /**
   * Generate video using async endpoint (with polling)
   * POST /v1/video/generations
   */
  async generateVideoAsync(params: {
    model: string;
    prompt: string;
  }): Promise<LaoZhangVideoTaskResponse> {
    const body = {
      model: params.model,
      prompt: params.prompt,
    };

    console.log("[Video API Async] Request:", JSON.stringify(body));

    const response = await fetchWithTimeout(`${this.baseUrl}/video/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 120000, // 2 minutes for video generation
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Video API error: ${responseText}`);
    }

    return JSON.parse(responseText);
  }

  /**
   * Check API health / balance
   */
  async checkBalance(): Promise<{ balance: number }> {
    try {
      // LaoZhang may have a balance endpoint
      const response = await fetchWithTimeout(`${this.baseUrl}/dashboard/billing/credit_grants`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000, // 10s for balance check
      });

      if (response.ok) {
        const data = await response.json();
        return { balance: data.total_available || 0 };
      }
      return { balance: -1 }; // Unknown
    } catch {
      return { balance: -1 };
    }
  }
}

// ===== SINGLETON =====

let clientInstance: LaoZhangClient | null = null;

export function getLaoZhangClient(apiKey?: string): LaoZhangClient {
  // If custom key provided, create new instance
  if (apiKey) {
    return new LaoZhangClient(apiKey);
  }
  
  // Otherwise use singleton
  if (!clientInstance) {
    clientInstance = new LaoZhangClient();
  }
  return clientInstance;
}

// ===== HELPER: Map LensRoom model ID to LaoZhang model =====

export function getLaoZhangModelId(
  lensroomModelId: string,
  resolution?: string
): string {
  // Nano Banana Pro with resolution variants
  if (lensroomModelId.includes("pro") || lensroomModelId === "nano-banana-pro") {
    if (resolution === "4k" || resolution === "4K") {
      return LAOZHANG_MODELS.NANO_BANANA_PRO_4K;
    }
    if (resolution === "2k" || resolution === "2K" || resolution === "1k_2k") {
      return LAOZHANG_MODELS.NANO_BANANA_PRO_2K;
    }
    return LAOZHANG_MODELS.NANO_BANANA_PRO;
  }

  // Nano Banana (flash/fast)
  return LAOZHANG_MODELS.NANO_BANANA;
}

// ===== CHECK IF MODEL USES LAOZHANG =====

export function isLaoZhangModel(modelId: string): boolean {
  return modelId === "nano-banana" || modelId === "nano-banana-pro";
}

export function isLaoZhangVideoModel(modelId: string): boolean {
  const laozhangVideoModels = [
    // Veo 3.1 720p
    "veo-3.1", "veo-3.1-fast", "veo-3.1-relaxed",
    "veo-3.1-landscape", "veo-3.1-landscape-fast", "veo-3.1-landscape-relaxed",
    // Veo 3.1 1080p HD
    "veo-3.1-landscape-hd", "veo-3.1-landscape-fast-hd", "veo-3.1-landscape-relaxed-hd",
    // Veo 3.1 4K
    "veo-3.1-fast-4k", "veo-3.1-landscape-fast-4k",
    // Veo 3.1 with reference images (-fl)
    "veo-3.1-fl", "veo-3.1-landscape-fl",
    "veo-3.1-landscape-fl-hd", "veo-3.1-landscape-fast-fl-hd", "veo-3.1-landscape-relaxed-fl-hd",
    // Sora
    "sora-2", "sora_video2", "sora_video2-15s", "sora_video2-landscape"
  ];
  return laozhangVideoModels.includes(modelId);
}

// ===== HELPER: Map LensRoom video model to LaoZhang =====

export function getLaoZhangVideoModelId(
  lensroomModelId: string,
  aspectRatio?: string,
  quality?: string,
  duration?: number | string,
  resolution?: string
): string {
  // Veo 3.1 mapping (supports veo-3.1, veo-3.1-fast, veo-3.1-quality)
  if (lensroomModelId === "veo-3.1" || lensroomModelId.startsWith("veo-3.1")) {
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "landscape";
    const isFast = quality === "fast" || lensroomModelId.includes("fast");
    const isRelaxed = quality === "relaxed" || lensroomModelId.includes("relaxed");
    const isHD = resolution === "1080p" || resolution === "hd" || resolution === "HD" || resolution === "1080";
    const is4K = resolution === "4k" || resolution === "4K" || resolution === "2160p";

    console.log("[LaoZhang Model] Selecting Veo model:", {
      input: lensroomModelId,
      aspectRatio,
      quality,
      resolution,
      isLandscape,
      isFast,
      isRelaxed,
      isHD,
      is4K,
    });

    // 4K models (only landscape fast supported)
    if (is4K && isLandscape && isFast) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST_4K;
    if (is4K && isFast) return LAOZHANG_MODELS.VEO_31_FAST_4K;

    // HD/1080p models (landscape only for HD)
    if (isHD && isLandscape && isRelaxed) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_RELAXED_HD;
    if (isHD && isLandscape && isFast) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST_HD;
    if (isHD && isLandscape) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_HD;
    // For HD with non-landscape, fall back to landscape HD (1080p requires 16:9)
    if (isHD) {
      console.log("[LaoZhang Model] HD requires 16:9, using landscape HD model");
      if (isRelaxed) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_RELAXED_HD;
      if (isFast) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST_HD;
      return LAOZHANG_MODELS.VEO_31_LANDSCAPE_HD;
    }

    // Standard 720p models
    if (isLandscape && isRelaxed) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_RELAXED;
    if (isLandscape && isFast) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST;
    if (isLandscape) return LAOZHANG_MODELS.VEO_31_LANDSCAPE;
    if (isRelaxed) return LAOZHANG_MODELS.VEO_31_RELAXED;
    if (isFast) return LAOZHANG_MODELS.VEO_31_FAST;
    return LAOZHANG_MODELS.VEO_31;
  }

  // Sora 2 mapping
  if (lensroomModelId === "sora-2" || lensroomModelId.startsWith("sora")) {
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "landscape";

    const d = typeof duration === "number" ? duration : Number(duration);
    const is15s = Number.isFinite(d) ? d >= 15 : false;

    if (is15s) return LAOZHANG_MODELS.SORA_VIDEO2_15S;
    if (isLandscape) return LAOZHANG_MODELS.SORA_VIDEO2_LANDSCAPE;
    return LAOZHANG_MODELS.SORA_2;
  }

  // Default - return as-is
  return lensroomModelId;
}
