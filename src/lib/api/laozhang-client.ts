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
  VEO_31_LANDSCAPE: "veo-3.1-landscape",
  VEO_31_LANDSCAPE_FAST: "veo-3.1-landscape-fast",
  
  // 4K models (higher resolution)
  VEO_31_FAST_4K: "veo-3.1-fast-4k",
  VEO_31_LANDSCAPE_FAST_4K: "veo-3.1-landscape-fast-4k",
  
  // Multiple reference images support (-fl suffix)
  // NOTE: Only works with standard veo-3.1 (NOT fast models)
  VEO_31_FL: "veo-3.1-fl",
  VEO_31_LANDSCAPE_FL: "veo-3.1-landscape-fl",
  
  // === VIDEO MODELS - SORA ===
  SORA_2: "sora-2",
  SORA_VIDEO2: "sora_video2",
  SORA_VIDEO2_15S: "sora_video2-15s",
  SORA_VIDEO2_LANDSCAPE: "sora_video2-landscape",
} as const;

// ===== TYPES =====

export interface LaoZhangImageRequest {
  model: string;
  prompt: string;
  n?: number; // Number of images (default 1)
  size?: string; // e.g., "1024x1024", "1024x1536", "1536x1024"
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

export class LaoZhangClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    // Use provided key or fall back to env
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
   * - Multiple refs (2-3): Only standard veo-3.1 (NOT fast), uses -fl suffix
   * - Single first frame: veo-3.1-fast with action: "image2video"
   * 
   * Supports: t2v (text only), i2v (single image), start_end (first + last frame)
   */
  async generateVideo(params: {
    model: string;
    prompt: string;
    startImageUrl?: string; // First frame image URL (for i2v)
    endImageUrl?: string; // Last frame image URL (for start_end mode)
    referenceImages?: string[]; // Reference images (for standard veo-3.1 only, NOT fast)
  }): Promise<LaoZhangVideoResponse> {
    const hasReferenceImages = params.referenceImages && params.referenceImages.length > 0;
    const isFastModel = params.model.includes('fast');
    
    // IMPORTANT: Multiple reference images only work with standard veo-3.1 (NOT fast)
    if (hasReferenceImages && isFastModel) {
      console.warn('[Video API] ⚠️  Fast models do NOT support multiple reference images!');
      console.warn('[Video API] Use standard veo-3.1 for 2-3 references, or use first image only for fast');
      
      // Use only first image as startImageUrl for fast models
      if (params.referenceImages && params.referenceImages.length > 0) {
        console.log('[Video API] Converting first reference image to startImageUrl for fast model');
        params.startImageUrl = params.referenceImages[0];
        params.referenceImages = undefined;
      }
    }
    
    // IMPORTANT: Always use chat/completions format for Veo
    // The /video/generations endpoint is async-only (returns taskId, not URL)
    // chat/completions returns URL directly in response
    return this.generateVideoChatFormat(params);
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
    
    // Handle async response - might need polling
    if (result.id && !result.videoUrl) {
      console.log('[Video API] Async response received, task ID:', result.id);
      // Return task info, caller should poll for completion
      return {
        id: result.id,
        videoUrl: '', // Will be available after polling
        model: finalModel,
        created: Date.now() / 1000,
      };
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
   * Generate video using chat/completions format
   * Works for all Veo models (fast and standard) and Sora
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
    "veo-3.1", "veo-3.1-fast", "veo-3.1-landscape", "veo-3.1-landscape-fast",
    "sora-2", "sora_video2", "sora_video2-15s", "sora_video2-landscape"
  ];
  return laozhangVideoModels.includes(modelId);
}

// ===== HELPER: Map LensRoom video model to LaoZhang =====

export function getLaoZhangVideoModelId(
  lensroomModelId: string,
  aspectRatio?: string,
  quality?: string,
  duration?: number | string
): string {
  // Veo 3.1 mapping (supports veo-3.1, veo-3.1-fast, veo-3.1-quality)
  if (lensroomModelId === "veo-3.1" || lensroomModelId.startsWith("veo-3.1")) {
    const isLandscape = aspectRatio === "16:9" || aspectRatio === "landscape";
    const isFast = quality === "fast" || lensroomModelId.includes("fast");
    
    if (isLandscape && isFast) return LAOZHANG_MODELS.VEO_31_LANDSCAPE_FAST;
    if (isLandscape) return LAOZHANG_MODELS.VEO_31_LANDSCAPE;
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
