// ===== KIE.AI API CLIENT =====
// Documentation: https://docs.kie.ai
// 
// Two API endpoints:
// 1. Market API: POST https://api.kie.ai/api/v1/jobs/createTask
// 2. Veo 3.1 API: POST https://api.kie.ai/api/v1/veo/generate

import type { KieProvider } from '@/config/models';
import { env } from "@/lib/env";

// ===== REQUEST TYPES =====

export interface CreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
}

export interface VeoGenerateRequest {
  prompt: string;
  model?: 'veo3' | 'veo3_fast'; // veo3 = quality, veo3_fast = fast
  aspectRatio?: string;
  enhancePrompt?: boolean;
  // For image-to-video
  imageUrls?: string[];
  // For callback webhook
  callBackUrl?: string;
}

// ===== RESPONSE TYPES =====

export interface CreateTaskResponse {
  code: number;
  message: string;
  msg?: string;
  data: {
    taskId: string;
    recordId?: string;
  };
}

export interface VeoGenerateResponse {
  code: number;
  message: string;
  msg?: string;
  data: {
    taskId: string;
  };
}

export interface VeoRecordInfoResponse {
  code: number;
  message: string;
  msg?: string;
  data: {
    taskId: string;
    successFlag: number; // 0=processing, 1=success, 2=failed, 3=invalid
    // Newer responses include result URLs under `response`
    response?: {
      resultUrls?: string[];
      originUrls?: string[] | null;
      resolution?: string;
      hasAudioList?: boolean[];
      seeds?: number[];
    };
    // Older/alternate schema
    info?: {
      resultUrls?: string[]; // Video URLs when successFlag=1
      errorMsg?: string;
    };
    errorMessage?: string | null;
  };
}

export interface Veo1080pResponse {
  code: number;
  message: string;
  msg?: string;
  data: {
    video1080pUrl?: string;
    status?: string;
  };
}

// State values from KIE API
export type KieTaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

export interface RecordInfoResponse {
  code: number;
  message: string;
  msg?: string;
  data: {
    taskId: string;
    model: string;
    state: KieTaskState;
    param: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime: number;
    updateTime?: number;
  };
}

export interface ParsedResult {
  resultUrls: string[];
  videoUrl?: string;
}

// ===== GENERATION TYPES =====

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerateImageRequest {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "4K";
  outputFormat?: "png" | "jpg";
  quality?: "fast" | "turbo" | "balanced" | "quality" | "ultra";
  imageInputs?: string[];
}

export interface GenerateImageResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    width: number;
    height: number;
    seed?: number;
  }[];
  error?: string;
}

export interface GenerateVideoRequest {
  model: string;
  provider: KieProvider;
  prompt?: string;
  imageUrl?: string;
  imageUrls?: string[];
  lastFrameUrl?: string; // For start_end mode
  duration?: number | string;
  aspectRatio?: string;
  sound?: boolean;
  mode?: 't2v' | 'i2v' | 'start_end' | 'storyboard';
  resolution?: string; // For bytedance: 480p/720p/1080p
  quality?: string; // For sora-pro: standard/high
  // For storyboard mode
  shots?: Array<{
    prompt: string;
    duration?: number;
  }>;
}

export interface GenerateVideoResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    duration: number;
  }[];
  error?: string;
}

// ===== API ERROR =====

export class KieAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "KieAPIError";
  }
}

// ===== CLIENT CLASS =====

export type KieClientConfig = {
  baseUrl: string;
  apiKey: string;
  mockMode: boolean;
  callbackUrlBase: string; // e.g. https://lensroom.ru
  callbackSecret: string;
  veoWebhookSecret?: string;
};

export class KieAIClient {
  private baseUrl: string;
  private apiKey: string;
  private _isMockMode: boolean;
  private callbackUrlBase: string;
  private callbackSecret: string;
  private veoWebhookSecret?: string;

  constructor(config: KieClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this._isMockMode = config.mockMode;
    this.callbackUrlBase = config.callbackUrlBase;
    this.callbackSecret = config.callbackSecret;
    this.veoWebhookSecret = config.veoWebhookSecret;
  }

  isInMockMode(): boolean {
    return this._isMockMode;
  }

  // ===== RAW API METHODS =====

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let parsedBody: unknown = undefined;
    if (options.body) {
      try {
        parsedBody = JSON.parse(options.body as string);
      } catch {
        parsedBody = String(options.body);
      }
    }

    console.log("[KIE API] Request:", {
      url,
      method: options.method || "GET",
      body: parsedBody,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    // Check for empty response
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error("[KIE API] Empty response from:", url);
      throw new KieAPIError("Empty response from API", response.status);
    }

    // Parse JSON safely
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("[KIE API] Invalid JSON response:", text.substring(0, 500));
      throw new KieAPIError(`Invalid JSON response: ${text.substring(0, 100)}`, response.status);
    }
    
    console.log("[KIE API] Response:", data);

    // KIE API returns code in body
    if (data.code && data.code !== 200) {
      throw new KieAPIError(
        data.message || data.msg || `API Error: ${data.code}`,
        data.code
      );
    }

    if (!response.ok) {
      throw new KieAPIError(
        data.message || `HTTP ${response.status}`,
        response.status
      );
    }

    return data;
  }

  // ===== MARKET API - CREATE TASK =====
  // POST /api/v1/jobs/createTask
  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    if (this._isMockMode) {
      return this.mockCreateTask(request);
    }

    return this.request<CreateTaskResponse>("/api/v1/jobs/createTask", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ===== VEO 3.1 API - GENERATE =====
  // POST /api/v1/veo/generate
  async veoGenerate(request: VeoGenerateRequest): Promise<VeoGenerateResponse> {
    if (this._isMockMode) {
      return this.mockVeoGenerate(request);
    }

    // Set default model if not provided
    const requestBody = {
      ...request,
      model: request.model || 'veo3', // Default to quality mode
    };

    return this.request<VeoGenerateResponse>("/api/v1/veo/generate", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  }

  // ===== VEO 3.1 API - GET STATUS =====
  // GET /api/v1/veo/record-info?taskId=xxx
  async veoGetStatus(taskId: string): Promise<VeoRecordInfoResponse> {
    if (this._isMockMode) {
      return this.mockVeoGetStatus(taskId);
    }

    return this.request<VeoRecordInfoResponse>(`/api/v1/veo/record-info?taskId=${taskId}`, {
      method: "GET",
    });
  }

  // ===== VEO 3.1 API - GET 1080P =====
  // GET /api/v1/veo/get-1080p-video?taskId=xxx
  async veoGet1080p(taskId: string): Promise<Veo1080pResponse> {
    if (this._isMockMode) {
      return {
        code: 200,
        message: "success",
        data: {
          video1080pUrl: "https://sample-videos.com/video321/mp4/1080/big_buck_bunny_1080p_1mb.mp4",
          status: "completed",
        },
      };
    }

    return this.request<Veo1080pResponse>(`/api/v1/veo/get-1080p-video?taskId=${taskId}`, {
      method: "GET",
    });
  }

  // ===== VEO 3.1 API - WAIT FOR COMPLETION =====
  // Poll status until completion or timeout
  async veoWaitForCompletion(
    taskId: string,
    maxWaitMs: number = 10 * 60 * 1000, // 10 minutes default
    pollIntervalMs: number = 30 * 1000 // 30 seconds
  ): Promise<string[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.veoGetStatus(taskId);

      console.log(`[VEO] Task ${taskId} status: successFlag=${status.data.successFlag}`);

      if (status.data.successFlag === 1) {
        // Success
        const urls =
          status.data.response?.resultUrls ||
          status.data.info?.resultUrls ||
          [];
        console.log(`[VEO] Task ${taskId} completed with ${urls.length} video(s)`);
        return urls;
      } else if (status.data.successFlag === 2 || status.data.successFlag === 3) {
        // Failed or invalid
        const errorMsg =
          status.data.errorMessage ||
          status.data.info?.errorMsg ||
          'Video generation failed';
        throw new KieAPIError(errorMsg, 500);
      }

      // Still processing (successFlag === 0), wait and retry
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new KieAPIError('Video generation timeout', 408);
  }

  // ===== QUERY TASK =====
  async queryTask(taskId: string): Promise<RecordInfoResponse> {
    if (this._isMockMode) {
      return this.mockQueryTask(taskId);
    }

    return this.request<RecordInfoResponse>(`/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
    });
  }

  // ===== IMAGE GENERATION =====
  // Models: google/nano-banana, google/imagen4, seedream/4.5-text-to-image, etc.
  
  async generateImage(params: GenerateImageRequest): Promise<GenerateImageResponse> {
    try {
      // Build input based on model requirements
      const input: Record<string, unknown> = {
        prompt: params.prompt,
      };

      // FLUX.2 Pro requires BOTH resolution AND aspect_ratio
      if (params.model.includes('flux-2')) {
        input.resolution = params.resolution || '1K';
        input.aspect_ratio = params.aspectRatio || '16:9';
      } else if (params.model.startsWith('seedream/4.5')) {
        // Seedream requires `quality`: basic (2K) / high (4K)
        input.aspect_ratio = params.aspectRatio || '1:1';
        // In our UI we use Turbo/Balanced/Quality tiers. Map them to Seedream basic/high.
        // - quality -> high (best)
        // - turbo/balanced/other -> basic
        input.quality = params.quality === 'quality' || params.quality === 'ultra' ? 'high' : 'basic';
      } else if (params.model === 'z-image') {
        // Z-image: per docs only prompt + aspect_ratio are required
        input.aspect_ratio = params.aspectRatio || '1:1';
      } else if (params.model === 'qwen/image-edit') {
        // Qwen image-edit: requires image_url
        const img = params.imageInputs?.[0];
        if (!img) {
          throw new KieAPIError('image_url is required', 400);
        }
        input.image_url = img;
      } else {
        // For other models, add parameters conditionally
        if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
        if (params.resolution) input.resolution = params.resolution;
      }

      if (params.outputFormat) input.output_format = params.outputFormat;
      if (params.quality && params.model !== 'qwen/image-edit' && !params.model.startsWith('seedream/4.5')) {
        input.quality = params.quality;
      }
      if (params.imageInputs && params.imageInputs.length > 0 && params.model !== 'qwen/image-edit') {
        input.image_input = params.imageInputs;
      }

      const request: CreateTaskRequest = {
        model: params.model,
        input,
      };

      console.log('[KIE Image] Request:', JSON.stringify(request, null, 2));

      const response = await this.createTask(request);

      return {
        id: response.data.taskId,
        status: "queued",
        estimatedTime: 30,
      };
    } catch (error) {
      console.error("[KIE API] generateImage error:", error);
      throw error;
    }
  }

  async getGenerationStatus(taskId: string): Promise<GenerateImageResponse> {
    try {
      const response = await this.queryTask(taskId);
      const data = response.data;

      let outputs: GenerateImageResponse["outputs"];
      if (data.state === "success" && data.resultJson) {
        try {
          const result: ParsedResult = JSON.parse(data.resultJson);
          outputs = result.resultUrls.map((url) => ({
            url,
            width: 1024,
            height: 1024,
          }));
        } catch (e) {
          console.error("[KIE API] Failed to parse resultJson:", e);
        }
      }

      const statusMap: Record<KieTaskState, GenerationStatus> = {
        waiting: "queued",
        queuing: "queued",
        generating: "processing",
        success: "completed",
        fail: "failed",
      };

      const progressMap: Record<KieTaskState, number> = {
        waiting: 5,
        queuing: 15,
        generating: 50,
        success: 100,
        fail: 0,
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: progressMap[data.state] || 25,
        outputs,
        error: data.failMsg,
      };
    } catch (error) {
      console.error("[KIE API] getGenerationStatus error:", error);
      throw error;
    }
  }

  // ===== VIDEO GENERATION =====
  // Two providers:
  // - kie_market: kling, sora, bytedance via /api/v1/jobs/createTask
  // - kie_veo: veo 3.1 via /api/v1/veo/generate
  
  async generateVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    try {
      // Route to appropriate API based on provider
      if (params.provider === 'kie_veo') {
        return this.generateVeoVideo(params);
      }
      
      return this.generateMarketVideo(params);
    } catch (error) {
      console.error("[KIE API] generateVideo error:", error);
      throw error;
    }
  }

  // === VEO 3.1 VIDEO GENERATION ===
  private async generateVeoVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    // Veo API is strict about aspect ratios; it returns 422 "Ratio error" for unsupported values (e.g. 1:1).
    const rawAspect = String(params.aspectRatio || '16:9');
    const veoAspect = rawAspect === '1:1' ? '16:9' : rawAspect;
    if (rawAspect !== veoAspect) {
      console.warn('[VEO] Unsupported aspect ratio requested, falling back:', { rawAspect, veoAspect });
    }

    const request: VeoGenerateRequest = {
      prompt: params.prompt || '',
      aspectRatio: veoAspect,
      enhancePrompt: true,
    };

    // Select model based on quality
    // params.quality can be 'fast' or 'quality' from the model config
    if (params.quality === 'fast') {
      request.model = 'veo3_fast';
    } else {
      request.model = 'veo3'; // Default quality mode
    }

    // Add image URLs for i2v mode
    if (params.mode === 'i2v' && params.imageUrl) {
      request.imageUrls = [params.imageUrl];
    } else if (params.mode === 'i2v' && params.imageUrls && params.imageUrls.length > 0) {
      request.imageUrls = params.imageUrls;
    }

    // Note: Veo 3.1 API doesn't support start_end mode with separate first/last frames
    // If start_end is needed, use only the first image
    if (params.mode === 'start_end' && params.imageUrl) {
      request.imageUrls = [params.imageUrl];
      console.warn('[VEO] start_end mode: using first image only, Veo API does not support separate last frame');
    }

    // Add callback URL (recommended to keep delivery reliable)
    const base = this.callbackUrlBase.replace(/\/$/, "");
    const secret = this.veoWebhookSecret || this.callbackSecret;
    if (base && secret) {
      request.callBackUrl = `${base}/api/webhooks/veo?secret=${encodeURIComponent(secret)}`;
    }

    const response = await this.veoGenerate(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 180, // Veo takes longer (3 minutes)
    };
  }

  // === MARKET VIDEO GENERATION (Kling, Sora, Bytedance) ===
  private async generateMarketVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    const input: Record<string, unknown> = {};

    // Prompt (always required)
    if (params.prompt) {
      input.prompt = params.prompt;
    }

    // === KLING 2.6 specific parameters ===
    if (params.model.includes('kling')) {
      // Duration as string: "5" or "10"
      if (params.duration) {
        input.duration = String(params.duration);
      }
      // Aspect ratio: "1:1", "16:9", "9:16"
      if (params.aspectRatio) {
        input.aspect_ratio = params.aspectRatio;
      }
      // Sound: true/false
      if (params.sound !== undefined) {
        input.sound = params.sound;
      }
      // For i2v: image_urls array
      if ((params.mode === 'i2v' || params.mode === 'start_end') && params.imageUrl) {
        input.image_urls = [params.imageUrl];
      }
    }

    // === BYTEDANCE specific parameters ===
    else if (params.model.includes('bytedance')) {
      // image_url (singular, not array)
      if (params.imageUrl) {
        input.image_url = params.imageUrl;
      }
      // Duration as number: 5 or 10
      if (params.duration) {
        input.duration = Number(params.duration);
      }
      // Aspect ratio
      if (params.aspectRatio) {
        input.aspect_ratio = params.aspectRatio;
      }
      // Resolution: "480p", "720p", "1080p"
      if (params.resolution) {
        input.resolution = params.resolution;
      }
    }

    // === SORA specific parameters ===
    else if (params.model.includes('sora')) {
      // For Sora: use n_frames instead of duration (as string)
      if (params.duration) {
        input.n_frames = String(params.duration);
      }
      // Aspect ratio: "portrait" or "landscape"
      if (params.aspectRatio) {
        input.aspect_ratio = params.aspectRatio;
      }
      // Quality/Size for Sora Pro
      if (params.quality) {
        input.size = params.quality; // "standard" or "high"
      }
      // Image URLs for i2v
      if ((params.mode === 'i2v' || params.mode === 'start_end') && params.imageUrl) {
        input.image_urls = [params.imageUrl];
      }
      // Storyboard mode
      if (params.mode === 'storyboard' && params.shots) {
        input.shots = params.shots;
      }
    }

    // === Generic fallback ===
    else {
      if (params.duration) input.duration = String(params.duration);
      if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
      if (params.imageUrl) input.image_urls = [params.imageUrl];
    }

    const request: CreateTaskRequest = {
      model: params.model,
      input,
    };

    console.log('[KIE Market] Request:', JSON.stringify(request, null, 2));

    const response = await this.createTask(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 120,
    };
  }

  async getVideoGenerationStatus(taskId: string, provider?: KieProvider): Promise<GenerateVideoResponse> {
    try {
      // Veo uses different status endpoint
      if (provider === 'kie_veo' || taskId.includes('veo')) {
        return this.getVeoVideoStatus(taskId);
      }

      // Market API status
      const response = await this.queryTask(taskId);
      const data = response.data;

      let outputs: GenerateVideoResponse["outputs"];
      if (data.state === "success" && data.resultJson) {
        try {
          const result: ParsedResult = JSON.parse(data.resultJson);
          // Video results may have videoUrl or resultUrls
          const urls = result.videoUrl ? [result.videoUrl] : result.resultUrls;
          outputs = urls.map((url) => ({
            url,
            width: 1280,
            height: 720,
            duration: 5,
          }));
        } catch (e) {
          console.error("[KIE API] Failed to parse video resultJson:", e);
        }
      }

      const statusMap: Record<KieTaskState, GenerationStatus> = {
        waiting: "queued",
        queuing: "queued",
        generating: "processing",
        success: "completed",
        fail: "failed",
      };

      const progressMap: Record<KieTaskState, number> = {
        waiting: 5,
        queuing: 15,
        generating: 50,
        success: 100,
        fail: 0,
      };

      return {
        id: taskId,
        status: statusMap[data.state] || "processing",
        progress: progressMap[data.state] || 25,
        outputs,
        error: data.failMsg,
      };
    } catch (error) {
      console.error("[KIE API] getVideoGenerationStatus error:", error);
      throw error;
    }
  }

  // Get Veo video generation status
  private async getVeoVideoStatus(taskId: string): Promise<GenerateVideoResponse> {
    try {
      const response = await this.veoGetStatus(taskId);
      const data = response.data;

      let outputs: GenerateVideoResponse["outputs"];
      let status: GenerationStatus = "processing";
      let progress = 50;
      let error: string | undefined;

      if (data.successFlag === 1) {
        // Success
        status = "completed";
        progress = 100;
        let urls =
          data.response?.resultUrls ||
          data.info?.resultUrls ||
          [];

        // Some Veo tasks return successFlag=1 but resultUrls is empty.
        // In that case, try to fetch 1080p URL via get-1080p-video endpoint.
        if (!urls || urls.length === 0) {
          try {
            const p1080 = await this.veoGet1080p(taskId);
            const u = p1080?.data?.video1080pUrl;
            if (u) urls = [u];
          } catch (e) {
            console.warn("[VEO] 1080p fallback failed:", e);
          }
        }

        outputs = urls.map((url) => ({
          url,
          width: 1920,
          height: 1080,
          duration: 8,
        }));
      } else if (data.successFlag === 2 || data.successFlag === 3) {
        // Failed
        status = "failed";
        progress = 0;
        error =
          data.errorMessage ||
          data.info?.errorMsg ||
          'Video generation failed';
      } else {
        // Processing (successFlag === 0)
        status = "processing";
        progress = 50;
      }

      return {
        id: taskId,
        status,
        progress,
        outputs,
        error,
      };
    } catch (error) {
      console.error("[KIE API] getVeoVideoStatus error:", error);
      throw error;
    }
  }

  // ===== PREMIUM MODEL HELPERS =====

  /**
   * Generate image with Seedream 4.5
   * Model: seedream/4.5-text-to-image
   */
  async generateSeedream45(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
    steps?: number;
    seed?: number;
    guidanceScale?: number;
  }): Promise<GenerateImageResponse> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (params.negativePrompt) input.negative_prompt = params.negativePrompt;
    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
    if (params.steps) input.steps = params.steps;
    if (params.seed) input.seed = params.seed;
    if (params.guidanceScale) input.guidance_scale = params.guidanceScale;

    const request: CreateTaskRequest = {
      model: 'seedream/4.5-text-to-image',
      input,
    };

    const response = await this.createTask(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 30,
    };
  }

  /**
   * Generate image with FLUX.2 Pro
   * Model: flux-2/pro-text-to-image
   * REQUIRES: resolution AND aspect_ratio
   */
  async generateFlux2Pro(params: {
    prompt: string;
    resolution: '1K' | '2K';
    aspectRatio: string;
    negativePrompt?: string;
  }): Promise<GenerateImageResponse> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
    };

    if (params.negativePrompt) input.negative_prompt = params.negativePrompt;

    const request: CreateTaskRequest = {
      model: 'flux-2/pro-text-to-image',
      input,
    };

    console.log('[FLUX.2 Pro] Request:', JSON.stringify(request, null, 2));

    const response = await this.createTask(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 30,
    };
  }

  /**
   * Generate video with Kling 2.6 (text-to-video)
   * Model: kling-2.6/text-to-video
   */
  async generateKling26Video(params: {
    prompt: string;
    duration?: 5 | 10;
    aspectRatio?: '1:1' | '16:9' | '9:16';
    sound?: boolean;
  }): Promise<GenerateVideoResponse> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      duration: String(params.duration || 5),
      aspect_ratio: params.aspectRatio || '16:9',
    };

    if (params.sound !== undefined) {
      input.sound = params.sound;
    }

    const request: CreateTaskRequest = {
      model: 'kling-2.6/text-to-video',
      input,
    };

    const response = await this.createTask(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 120,
    };
  }

  /**
   * Generate video with Bytedance V1 Pro (image-to-video)
   * Model: bytedance/v1-pro-image-to-video
   */
  async generateBytedanceV1Pro(params: {
    imageUrl: string;
    prompt: string;
    duration?: 5 | 10;
    aspectRatio?: string;
    resolution?: '480p' | '720p' | '1080p';
  }): Promise<GenerateVideoResponse> {
    const input: Record<string, unknown> = {
      image_url: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration || 5,
    };

    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
    if (params.resolution) input.resolution = params.resolution;

    const request: CreateTaskRequest = {
      model: 'bytedance/v1-pro-image-to-video',
      input,
    };

    const response = await this.createTask(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 120,
    };
  }

  // ===== CHECK KIE CREDITS =====
  async getCredits(): Promise<{ balance: number }> {
    try {
      const response = await this.request<{ code: number; data: { balance: number } }>(
        "/api/v1/chat/credit",
        { method: "GET" }
      );
      return { balance: response.data.balance };
    } catch (error) {
      console.error("[KIE API] getCredits error:", error);
      return { balance: 0 };
    }
  }

  // ===== UTILITY =====
  
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=test`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.status !== 500;
    } catch {
      return false;
    }
  }

  // ===== MOCK METHODS =====

  private mockTaskProgress = new Map<string, { startTime: number; duration: number; isVideo: boolean }>();

  private mockCreateTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    const taskId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const isVideo = request.model.includes("sora") || request.model.includes("kling") || 
                    request.model.includes("luma") || request.model.includes("runway") ||
                    request.model.includes("veo") || request.model.includes("bytedance");
    
    this.mockTaskProgress.set(taskId, {
      startTime: Date.now(),
      duration: isVideo ? 10000 : 5000,
      isVideo,
    });

    console.log("[KIE API MOCK] Created task:", taskId, "for model:", request.model);

    return Promise.resolve({
      code: 200,
      message: "success",
      data: { taskId },
    });
  }

  private mockVeoGenerate(request: VeoGenerateRequest): Promise<VeoGenerateResponse> {
    const taskId = `mock_veo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.mockTaskProgress.set(taskId, {
      startTime: Date.now(),
      duration: 15000, // Veo takes longer
      isVideo: true,
    });

    console.log("[KIE API MOCK] Created Veo task:", taskId, "model:", request.model || 'veo3');

    return Promise.resolve({
      code: 200,
      message: "success",
      data: { taskId },
    });
  }

  private mockVeoGetStatus(taskId: string): Promise<VeoRecordInfoResponse> {
    const progress = this.mockTaskProgress.get(taskId);
    
    if (!progress) {
      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          successFlag: 3, // Invalid
          info: {
            errorMsg: "Task not found",
          },
        },
      });
    }

    const elapsed = Date.now() - progress.startTime;
    const isComplete = elapsed >= progress.duration;

    if (isComplete) {
      this.mockTaskProgress.delete(taskId);

      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          successFlag: 1, // Success
          info: {
            resultUrls: ["https://sample-videos.com/video321/mp4/1080/big_buck_bunny_1080p_1mb.mp4"],
          },
        },
      });
    }

    // Still processing
    return Promise.resolve({
      code: 200,
      message: "success",
      data: {
        taskId,
        successFlag: 0, // Processing
      },
    });
  }

  private mockQueryTask(taskId: string): Promise<RecordInfoResponse> {
    const progress = this.mockTaskProgress.get(taskId);
    
    if (!progress) {
      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          model: "unknown",
          state: "fail" as KieTaskState,
          param: "{}",
          createTime: Date.now(),
          updateTime: Date.now(),
          failMsg: "Task not found",
        },
      });
    }

    const elapsed = Date.now() - progress.startTime;
    const isComplete = elapsed >= progress.duration;

    if (isComplete) {
      this.mockTaskProgress.delete(taskId);

      const mockUrls = progress.isVideo 
        ? ["https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"]
        : [
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&h=1024&fit=crop",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024&h=1024&fit=crop",
          ];

      return Promise.resolve({
        code: 200,
        message: "success",
        data: {
          taskId,
          model: "mock-model",
          state: "success" as KieTaskState,
          param: "{}",
          createTime: progress.startTime,
          updateTime: Date.now(),
          completeTime: Date.now(),
          resultJson: JSON.stringify({ resultUrls: mockUrls }),
        },
      });
    }

    const progressPercent = elapsed / progress.duration;
    let state: KieTaskState = "waiting";
    if (progressPercent > 0.1) state = "queuing";
    if (progressPercent > 0.3) state = "generating";

    return Promise.resolve({
      code: 200,
      message: "success",
      data: {
        taskId,
        model: "mock-model",
        state,
        param: "{}",
        createTime: progress.startTime,
        updateTime: Date.now(),
      },
    });
  }
}

export function getKieConfig() {
  // Evaluate env only when KIE integration is actually used.
  const apiKey = env.required("KIE_API_KEY", "KIE API key");
  const callbackSecret = env.required("KIE_CALLBACK_SECRET", "KIE callback secret");
  const callbackUrlBase = env.required("KIE_CALLBACK_URL", "Public base URL for callbacks");
  const baseUrl = env.optional("NEXT_PUBLIC_KIE_API_URL") || "https://api.kie.ai";
  const mockMode = env.bool("NEXT_PUBLIC_MOCK_MODE");
  const veoWebhookSecret = env.optional("VEO_WEBHOOK_SECRET") || undefined;

  const missing: string[] = [];
  if (!apiKey) missing.push("KIE_API_KEY");
  if (!callbackSecret) missing.push("KIE_CALLBACK_SECRET");
  if (!callbackUrlBase) missing.push("KIE_CALLBACK_URL");

  return {
    baseUrl,
    apiKey,
    callbackSecret,
    callbackUrlBase,
    veoWebhookSecret,
    mockMode,
    missing,
  };
}

let _kieClient: KieAIClient | null = null;
let _kieClientKey: string | null = null;

export function getKieClient(): KieAIClient {
  const cfg = getKieConfig();

  // In dev we return 501 from handlers if not configured.
  // In prod env.required already throws.
  if (!cfg.mockMode && cfg.missing.length) {
    throw new Error(`[KIE] not configured: ${cfg.missing.join(", ")}`);
  }

  const key = JSON.stringify([cfg.baseUrl, cfg.apiKey, cfg.callbackUrlBase, cfg.callbackSecret, cfg.mockMode]);
  if (_kieClient && _kieClientKey === key) return _kieClient;

  _kieClient = new KieAIClient({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    callbackSecret: cfg.callbackSecret,
    callbackUrlBase: cfg.callbackUrlBase,
    veoWebhookSecret: cfg.veoWebhookSecret,
    mockMode: cfg.mockMode || !cfg.apiKey,
  });
  _kieClientKey = key;
  return _kieClient;
}
