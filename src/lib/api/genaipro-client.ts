// ===== GENAIPRO API CLIENT =====
// GenAIPro - API aggregator for Veo, Nano Banana and other AI models
// Documentation: https://genaipro.vn/docs-api
// Base URL: https://genaipro.vn/api/v1

import { env } from "@/lib/env";

// ===== MODEL IDS =====

export const GENAIPRO_MODELS = {
  // === IMAGE MODELS ===
  NANO_BANANA: "nano-banana",
  NANO_BANANA_PRO: "nano-banana-pro",
  
  // === VIDEO MODELS ===
  VEO_3_1: "veo-3.1",
  VEO_3_1_FAST: "veo-3.1-fast",
} as const;

// ===== ASPECT RATIO CONSTANTS =====

export const IMAGE_ASPECT_RATIOS = {
  LANDSCAPE: "IMAGE_ASPECT_RATIO_LANDSCAPE", // 16:9
  PORTRAIT: "IMAGE_ASPECT_RATIO_PORTRAIT",   // 9:16
  SQUARE: "IMAGE_ASPECT_RATIO_SQUARE",       // 1:1
} as const;

export const VIDEO_ASPECT_RATIOS = {
  LANDSCAPE: "VIDEO_ASPECT_RATIO_LANDSCAPE", // 16:9
  PORTRAIT: "VIDEO_ASPECT_RATIO_PORTRAIT",   // 9:16
  SQUARE: "VIDEO_ASPECT_RATIO_SQUARE",       // 1:1
} as const;

// ===== TYPES =====

export interface GenAIProImageRequest {
  prompt: string;
  aspect_ratio?: string; // IMAGE_ASPECT_RATIO_LANDSCAPE / PORTRAIT / SQUARE
  number_of_images?: number;
  reference_images?: File[] | Blob[]; // Optional reference images
}

export interface GenAIProImageResponse {
  images?: Array<{
    url: string;
    content_type?: string;
  }>;
  usage?: {
    credits_used: number;
  };
}

export interface GenAIProVideoTextRequest {
  prompt: string;
  aspect_ratio?: string; // VIDEO_ASPECT_RATIO_LANDSCAPE / PORTRAIT / SQUARE
  number_of_videos?: number;
}

export interface GenAIProVideoFramesRequest {
  start_image: File | Blob;
  end_image?: File | Blob;
  prompt?: string;
  aspect_ratio?: string;
  number_of_videos?: number;
}

export interface GenAIProVideoIngredientsRequest {
  reference_images: (File | Blob)[];
  prompt: string;
  number_of_videos?: number;
}

export interface GenAIProVideoResponse {
  videos?: Array<{
    url: string;
    thumbnail_url?: string;
    duration?: number;
  }>;
  usage?: {
    credits_used: number;
  };
}

export interface GenAIProUserInfo {
  user_id?: string;
  email?: string;
  credits?: number;
  subscription?: string;
}

export interface GenAIProVeoQuota {
  quota_remaining?: number;
  quota_total?: number;
  reset_date?: string;
}

export interface GenAIProError {
  error: {
    message: string;
    type: string;
    param?: string | null;
    code?: string | null;
  };
}

// ===== ASPECT RATIO MAPPING =====

// Map our aspect ratios to pixel sizes
export function aspectRatioToGenAIProSize(aspectRatio: string): string {
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
      return "1024x1280";
    case "5:4":
    case "6:5":
      return "1280x1024";
    case "21:9":
    case "2:1":
      return "1536x768";
    case "1:2":
      return "768x1536";
    case "9:21":
      return "768x1792";
    case "1:1":
    default:
      return "1024x1024"; // Square / fallback
  }
}

// Map resolution tier to size
export function resolutionToGenAIProSize(
  resolution: string,
  aspectRatio: string
): string {
  const aspect = aspectRatio || "1:1";

  // Calculate base dimensions for aspect ratio
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
    "1k_2k": 1.5,
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

  // Round to nearest 64
  width = Math.round(width / 64) * 64;
  height = Math.round(height / 64) * 64;

  // Clamp to reasonable limits
  width = Math.min(Math.max(width, 512), 4096);
  height = Math.min(Math.max(height, 512), 4096);

  return `${width}x${height}`;
}

// ===== API CLIENT =====

export class GenAIProClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    // Use provided key or fall back to env
    const key = apiKey || env.optional("GENAIPRO_API_KEY");
    if (!key) {
      throw new Error(
        "GenAIPro API key not found. Please set GENAIPRO_API_KEY environment variable."
      );
    }
    this.apiKey = key;
    this.baseUrl = "https://genaipro.vn/api/v1"; // Correct base URL
  }

  /**
   * Handle API response
   */
  private async handleResponse(res: Response): Promise<any> {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GenAIPro API error ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  }

  /**
   * GET request helper
   */
  private async get(path: string, params?: Record<string, string | number>): Promise<any> {
    const url = new URL(this.baseUrl + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.set(k, String(v))
      );
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    return this.handleResponse(res);
  }

  /**
   * POST JSON request helper
   */
  private async postJson(path: string, body: any): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return this.handleResponse(res);
  }

  /**
   * POST FormData request helper
   */
  private async postFormData(path: string, formData: FormData): Promise<any> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        // Content-Type will be set automatically by FormData
      },
      body: formData,
    });

    return this.handleResponse(res);
  }

  // ===== USER INFO =====

  /**
   * Get user info and balance
   * GET /me
   */
  async getMe(): Promise<GenAIProUserInfo> {
    console.log("[GenAIPro] Getting user info");
    return this.get('/me');
  }

  /**
   * Get Veo quota
   * GET /veo/me
   */
  async getVeoQuota(): Promise<GenAIProVeoQuota> {
    console.log("[GenAIPro] Getting Veo quota");
    return this.get('/veo/me');
  }

  /**
   * Get Veo generation histories
   * GET /veo/histories
   */
  async getVeoHistories(page = 1, pageSize = 20): Promise<any> {
    console.log("[GenAIPro] Getting Veo histories", { page, pageSize });
    return this.get('/veo/histories', { page, page_size: pageSize });
  }

  // ===== IMAGE GENERATION =====

  /**
   * Generate images using Nano Banana
   * POST /veo/create-image
   */
  async generateImage(
    request: GenAIProImageRequest
  ): Promise<GenAIProImageResponse> {
    console.log("[GenAIPro] Generating image:", {
      prompt: request.prompt.substring(0, 50),
      aspect_ratio: request.aspect_ratio,
      number_of_images: request.number_of_images,
    });

    const formData = new FormData();
    formData.append('prompt', request.prompt);
    
    if (request.aspect_ratio) {
      formData.append('aspect_ratio', request.aspect_ratio);
    }
    
    if (request.number_of_images) {
      formData.append('number_of_images', String(request.number_of_images));
    }
    
    // Add reference images if provided
    if (request.reference_images && request.reference_images.length > 0) {
      request.reference_images.forEach((img) => {
        formData.append('reference_images', img);
      });
    }

    return this.postFormData('/veo/create-image', formData);
  }

  // ===== VIDEO GENERATION =====

  /**
   * Generate video from text (Text-to-Video)
   * POST /veo/text-to-video
   */
  async generateVideoFromText(
    request: GenAIProVideoTextRequest
  ): Promise<GenAIProVideoResponse> {
    console.log("[GenAIPro] Generating video from text:", {
      prompt: request.prompt.substring(0, 50),
      aspect_ratio: request.aspect_ratio,
      number_of_videos: request.number_of_videos,
    });

    const body = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio || VIDEO_ASPECT_RATIOS.LANDSCAPE,
      number_of_videos: request.number_of_videos || 1,
    };

    return this.postJson('/veo/text-to-video', body);
  }

  /**
   * Generate video from frames (start/end frames)
   * POST /veo/frames-to-video
   */
  async generateVideoFromFrames(
    request: GenAIProVideoFramesRequest
  ): Promise<GenAIProVideoResponse> {
    console.log("[GenAIPro] Generating video from frames:", {
      hasStartImage: !!request.start_image,
      hasEndImage: !!request.end_image,
      prompt: request.prompt?.substring(0, 50),
    });

    const formData = new FormData();
    formData.append('start_image', request.start_image);
    
    if (request.end_image) {
      formData.append('end_image', request.end_image);
    }
    
    if (request.prompt) {
      formData.append('prompt', request.prompt);
    }
    
    if (request.aspect_ratio) {
      formData.append('aspect_ratio', request.aspect_ratio);
    }
    
    if (request.number_of_videos) {
      formData.append('number_of_videos', String(request.number_of_videos));
    }

    return this.postFormData('/veo/frames-to-video', formData);
  }

  /**
   * Generate video from reference images (Ingredients-to-Video)
   * POST /veo/ingredients-to-video
   */
  async generateVideoFromIngredients(
    request: GenAIProVideoIngredientsRequest
  ): Promise<GenAIProVideoResponse> {
    console.log("[GenAIPro] Generating video from ingredients:", {
      imageCount: request.reference_images.length,
      prompt: request.prompt.substring(0, 50),
    });

    const formData = new FormData();
    
    request.reference_images.forEach((img) => {
      formData.append('reference_images', img);
    });
    
    formData.append('prompt', request.prompt);
    
    if (request.number_of_videos) {
      formData.append('number_of_videos', String(request.number_of_videos));
    }

    return this.postFormData('/veo/ingredients-to-video', formData);
  }

  /**
   * Check API health and get balance
   */
  async checkHealth(): Promise<{ balance: number; status: string }> {
    try {
      const userInfo = await this.getMe();
      return {
        balance: userInfo.credits || 0,
        status: 'ok',
      };
    } catch (error: any) {
      console.error("[GenAIPro] Health check failed:", error.message);
      return {
        balance: -1,
        status: 'error',
      };
    }
  }
}

// ===== SINGLETON =====

let clientInstance: GenAIProClient | null = null;

export function getGenAIProClient(apiKey?: string): GenAIProClient {
  // If custom key provided, create new instance
  if (apiKey) {
    return new GenAIProClient(apiKey);
  }
  
  // Otherwise use singleton
  if (!clientInstance) {
    clientInstance = new GenAIProClient();
  }
  return clientInstance;
}

// ===== HELPER: Map LensRoom model ID to GenAIPro model =====

export function getGenAIProModelId(
  lensroomModelId: string,
  resolution?: string
): string {
  // Nano Banana Pro with resolution variants
  if (lensroomModelId.includes("pro") || lensroomModelId === "nano-banana-pro") {
    return GENAIPRO_MODELS.NANO_BANANA_PRO;
  }

  // Nano Banana (standard)
  if (lensroomModelId === "nano-banana") {
    return GENAIPRO_MODELS.NANO_BANANA;
  }

  // Veo models
  if (lensroomModelId === "veo-3.1" || lensroomModelId === "veo-3.1-quality") {
    return GENAIPRO_MODELS.VEO_3_1;
  }
  if (lensroomModelId === "veo-3.1-fast") {
    return GENAIPRO_MODELS.VEO_3_1_FAST;
  }

  // Default - return as-is
  return lensroomModelId;
}

// ===== CHECK IF MODEL USES GENAIPRO =====

export function isGenAIProModel(modelId: string): boolean {
  const genaiproModels = ["nano-banana", "nano-banana-pro"];
  return genaiproModels.includes(modelId);
}

export function isGenAIProVideoModel(modelId: string): boolean {
  const genaiproVideoModels = ["veo-3.1", "veo-3.1-fast", "veo-3.1-quality"];
  return genaiproVideoModels.includes(modelId);
}
