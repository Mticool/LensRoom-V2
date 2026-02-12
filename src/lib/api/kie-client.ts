// ===== KIE.AI API CLIENT =====
// Documentation: https://docs.kie.ai
// 
// Two API endpoints:
// 1. Market API: POST https://api.kie.ai/api/v1/jobs/createTask
// 2. Veo 3.1 API: POST https://api.kie.ai/api/v1/veo/generate

import type { KieProvider } from '@/config/models';
import { env } from "@/lib/env";
import { getLaoZhangClient } from './laozhang-client';
import { fetchWithTimeout, FetchTimeoutError } from './fetch-with-timeout';
import { PROVIDER_CIRCUITS, CircuitOpenError } from '@/lib/server/circuit-breaker';
import { createHash } from 'crypto';

// ===== HELPER FUNCTIONS =====

/**
 * Extract URLs from a string (useful for truncated JSON)
 */
function extractUrlsFromString(text: string): string[] {
  if (!text) return [];
  
  // Try to find media URLs in the string
  const urlMatches = text.match(/https?:\/\/[^\s"'\\<>]+\.(png|jpg|jpeg|webp|gif|mp4|mov|webm|avi)[^\s"'\\<>]*/gi);
  if (urlMatches && urlMatches.length > 0) {
    // Clean up URLs (remove trailing punctuation)
    return urlMatches.map(url => url.replace(/[,;:'")\]}>]+$/, ''));
  }
  
  // If text itself looks like a URL
  if (text.startsWith('http') && (text.includes('.png') || text.includes('.jpg') || text.includes('.mp4'))) {
    return [text.split(/[\s"']/)[0]];
  }
  
  return [];
}

// ===== REQUEST TYPES =====

export interface CreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
}

export interface VeoGenerateRequest {
  prompt: string;
  model?: 'veo3' | 'veo3_fast'; // veo3 = quality, veo3_fast = fast
  generationType?: 'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO'; // API mode
  aspect_ratio?: string; // "16:9" | "9:16" | "Auto"
  seeds?: number; // Random seed (10000-99999)
  enableTranslation?: boolean; // Auto-translate prompts to English (default: true)
  watermark?: string; // Text overlay for branding
  // For image-to-video (1-2 images)
  imageUrls?: string[];
  // For callback webhook
  callBackUrl?: string;
}

export interface VeoExtendRequest {
  taskId: string; // ID оригинальной задачи генерации Veo
  prompt: string; // Описание продолжения видео
  seeds?: number; // Случайное зерно (10000-99999)
  watermark?: string; // Текст водяного знака
  callBackUrl?: string; // URL для асинхронного уведомления
}

export interface LipSyncParams {
  model: string; // API model: 'kling/ai-avatar-standard' | 'kling/ai-avatar-v1-pro' | 'infinitalk/from-audio'
  imageUrl: string; // URL изображения персонажа
  audioUrl: string; // URL аудио файла
  prompt?: string; // Описание эмоций/стиля (опционально)
  resolution?: '480p' | '720p'; // Разрешение (только для InfiniteTalk)
  seed?: number; // Случайное зерно (только для InfiniteTalk, 10000-1000000)
  callbackUrl?: string; // URL для callback уведомления
}

export interface AnimateVideoParams {
  model: string; // 'wan/2-2-animate-move' or 'wan/2-2-animate-replace'
  imageUrl: string; // URL статичного изображения (персонаж)
  videoUrl: string; // URL референс-видео (движения)
  quality?: '480p' | '580p' | '720p'; // Разрешение выходного видео
  prompt?: string; // Опциональный промпт
  callbackUrl?: string; // URL для callback уведомления
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
  // Tool-specific params
  scale?: string; // legacy alias for Topaz: "2x" | "4x"
  upscaleFactor?: number | string; // Topaz Upscale: 2 | 4 (API expects `upscale_factor`)
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
  videoUrl?: string; // For motion control: reference video
  duration?: number | string;
  aspectRatio?: string;
  sound?: boolean | string;
  mode?: 't2v' | 'i2v' | 'v2v' | 'v2v_edit' | 'start_end' | 'storyboard' | 'motion_control' | 'ref2v' | 'extend';
  resolution?: string; // For bytedance: 480p/720p/1080p; For motion control: 720p/1080p
  quality?: string; // For sora-pro: standard/high
  style?: string; // Grok Video style preset
  // For Veo 3.1 reference-to-video: array of reference images with weights
  referenceImages?: Array<{
    url?: string;
    weight?: number;
    type?: string;
  }> | string[]; // Can be array of objects or simple string array (converted internally)
  // For motion control: character orientation
  // 'image' = use orientation from reference image (max 10s video)
  // 'video' = use orientation from reference video (max 30s video)
  characterOrientation?: 'image' | 'video';
  cfgScale?: number;
  cameraControl?: Record<string, unknown> | string;
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

export type KieKeyScope = "default" | "photo" | "video";

function parseKeyPool(raw: string | undefined): string[] {
  if (!raw) return [];
  // Allow either comma or whitespace separated list.
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ScopeWithPool = Exclude<KieKeyScope, "default">;
const _rr = new Map<ScopeWithPool, number>();

export function pickKieKeySlot(scope: ScopeWithPool, poolSize: number): number | null {
  if (!poolSize || poolSize <= 0) return null;
  const prev = _rr.get(scope) || 0;
  const next = (prev + 1) % poolSize;
  _rr.set(scope, next);
  return next;
}

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
    const circuitKey = `kie:${createHash('sha1')
      .update(String(this.baseUrl))
      .update('|')
      .update(String(this.apiKey))
      .digest('hex')
      .slice(0, 12)}`;

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

    let response: Response;
    try {
      response = await PROVIDER_CIRCUITS.run(circuitKey, async () =>
        fetchWithTimeout(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...options.headers,
          },
          // KIE sometimes responds slowly on createTask; do not fail user flows at 30s.
          // Long work still happens async behind taskId, but initial acceptance can exceed 90s under load.
          timeout: 120_000,
        })
      );
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isTransient =
        err instanceof FetchTimeoutError ||
        err instanceof CircuitOpenError ||
        /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i.test(msg) ||
        /timeout/i.test(msg);

      if (isTransient) {
        PROVIDER_CIRCUITS.recordFailure(circuitKey);
      }
      throw err;
    }

    // Check for empty response
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error("[KIE API] Empty response from:", url);
      PROVIDER_CIRCUITS.recordFailure(circuitKey);
      throw new KieAPIError("Empty response from API", response.status);
    }

    // Parse JSON safely
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      const isLarge = text.length > 1_000_000;
      console.error(`[KIE API] Invalid JSON response (${text.length} bytes, large=${isLarge})`);
      if (!isLarge) {
        console.error("[KIE API] Response preview:", text.substring(0, 500));
      }
      
      // Try to extract data from truncated/large JSON using regex
      const stateMatch = text.match(/"state"\s*:\s*"(waiting|queuing|generating|success|fail)"/);
      const codeMatch = text.match(/"code"\s*:\s*(\d+)/);
      const taskIdMatch = text.match(/"taskId"\s*:\s*"([^"]+)"/);
      
      // Look for URLs with multiple patterns (more robust)
      let foundUrls: string[] = [];
      
      // Pattern 1: Direct URLs with image/video extensions
      const urlPattern1 = text.match(/https?:\/\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+\.(png|jpg|jpeg|webp|gif|mp4|mov|webm|avi)/gi);
      if (urlPattern1) foundUrls.push(...urlPattern1);
      
      // Pattern 2: URLs in JSON string format "url":"..."
      const urlPattern2 = text.match(/"(?:url|imageUrl|videoUrl|resultUrl)"\s*:\s*"(https?:\/\/[^"]+)"/gi);
      if (urlPattern2) {
        urlPattern2.forEach(m => {
          const match = m.match(/https?:\/\/[^"]+/);
          if (match) foundUrls.push(match[0]);
        });
      }
      
      // Pattern 3: URLs in resultUrls array
      const urlPattern3 = text.match(/"resultUrls"\s*:\s*\[([^\]]+)\]/);
      if (urlPattern3) {
        const arrayContent = urlPattern3[1];
        const urls = arrayContent.match(/https?:\/\/[^"',\s]+/g);
        if (urls) foundUrls.push(...urls);
      }
      
      // Deduplicate and clean URLs
      foundUrls = [...new Set(foundUrls)].map(url => url.replace(/[,;:'")\]}>\\]+$/, ''));
      
      if (stateMatch || codeMatch || foundUrls.length > 0) {
        console.log("[KIE API] Extracted from response:", {
          state: stateMatch?.[1],
          code: codeMatch?.[1],
          taskId: taskIdMatch?.[1],
          urlsFound: foundUrls.length,
          urls: foundUrls.slice(0, 3), // Log first 3
        });
        
        data = {
          code: codeMatch ? parseInt(codeMatch[1]) : 200,
          data: {
            state: stateMatch?.[1] || (foundUrls.length > 0 ? "success" : "generating"),
            taskId: taskIdMatch?.[1],
            resultJson: foundUrls.length > 0 ? JSON.stringify({ resultUrls: foundUrls }) : undefined,
          }
        };
      } else {
        PROVIDER_CIRCUITS.recordFailure(circuitKey);
        throw new KieAPIError(`Invalid JSON response (${text.length} bytes): ${text.substring(0, 100)}`, response.status);
      }
    }
    
    console.log("[KIE API] Response:", data);

    // KIE API returns code in body
    if (data.code && data.code !== 200) {
      const errorMessage = data.message || data.msg || `API Error: ${data.code}`;
      
      console.error("[KIE API] Error response:", {
        code: data.code,
        message: errorMessage,
        fullData: JSON.stringify(data).substring(0, 500),
      });

      // Trip the circuit only for transient/server-like failures.
      if (Number(data.code) >= 500 || Number(data.code) === 408 || Number(data.code) === 429) {
        PROVIDER_CIRCUITS.recordFailure(circuitKey);
      }
      
      // Проверка на ошибку политики контента Google
      if (
        errorMessage.includes('content policy') ||
        errorMessage.includes('violating content policies') ||
        errorMessage.includes('Rejected by Google') ||
        errorMessage.includes('content policies')
      ) {
        throw new KieAPIError(
          'Rejected by Google\'s content policy. Please revise your prompt or use Veo 3 Fallback API.',
          data.code,
          'CONTENT_POLICY_VIOLATION'
        );
      }
      
      throw new KieAPIError(
        errorMessage,
        data.code
      );
    }

    if (!response.ok) {
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        PROVIDER_CIRCUITS.recordFailure(circuitKey);
      }
      throw new KieAPIError(
        data.message || `HTTP ${response.status}`,
        response.status
      );
    }

    PROVIDER_CIRCUITS.recordSuccess(circuitKey);
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

  // ===== VEO 3.1 API - EXTEND =====
  // POST /api/v1/veo/extend
  async veoExtend(request: VeoExtendRequest): Promise<VeoGenerateResponse> {
    if (this._isMockMode) {
      return this.mockVeoGenerate({ prompt: request.prompt, model: 'veo3_fast' });
    }

    const requestBody: Record<string, unknown> = {
      taskId: request.taskId,
      prompt: request.prompt,
    };

    if (request.seeds !== undefined) {
      requestBody.seeds = request.seeds;
    }
    if (request.watermark) {
      requestBody.watermark = request.watermark;
    }
    if (request.callBackUrl) {
      requestBody.callBackUrl = request.callBackUrl;
    }

    return this.request<VeoGenerateResponse>("/api/v1/veo/extend", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
  }

  // ===== LIP SYNC API - GENERATE VIDEO FROM IMAGE + AUDIO =====
  // POST /api/v1/jobs/createTask (Kling AI Avatar & InfiniteTalk)
  async lipSyncVideo(params: LipSyncParams): Promise<CreateTaskResponse> {
    if (this._isMockMode) {
      return this.mockCreateTask({
        model: params.model,
        input: {
          image_url: params.imageUrl,
          audio_url: params.audioUrl,
        },
      });
    }

    const input: Record<string, unknown> = {
      image_url: params.imageUrl,
      audio_url: params.audioUrl,
    };

    // Добавить опциональные параметры
    if (params.prompt) {
      input.prompt = params.prompt;
    }

    // Resolution и seed только для InfiniteTalk
    if (params.resolution) {
      input.resolution = params.resolution;
    }

    if (params.seed !== undefined) {
      input.seed = params.seed;
    }

    const request: CreateTaskRequest = {
      model: params.model,
      input,
      ...(params.callbackUrl && { callBackUrl: params.callbackUrl }),
    };

    console.log('[KIE Lip Sync] Request:', JSON.stringify(request, null, 2));

    return this.createTask(request);
  }

  // ===== WAN 2.2 ANIMATE API - MOTION TRANSFER / CHARACTER SWAP =====
  // POST /api/v1/jobs/createTask (wan/2-2-animate-move & wan/2-2-animate-replace)
  async animateVideo(params: AnimateVideoParams): Promise<CreateTaskResponse> {
    if (this._isMockMode) {
      return this.mockCreateTask({
        model: params.model,
        input: {
          image_url: params.imageUrl,
          video_url: params.videoUrl,
        },
      });
    }

    const input: Record<string, unknown> = {
      image_url: params.imageUrl,
      video_url: params.videoUrl,
    };

    if (params.quality) {
      input.quality = params.quality;
    }

    if (params.prompt) {
      input.prompt = params.prompt;
    }

    const request: CreateTaskRequest = {
      model: params.model,
      input,
      ...(params.callbackUrl && { callBackUrl: params.callbackUrl }),
    };

    console.log('[KIE WAN Animate] Request:', JSON.stringify(request, null, 2));

    return this.createTask(request);
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

      const data: any = (status as any)?.data;
      const successFlag: number | undefined = typeof data?.successFlag === "number" ? data.successFlag : undefined;
      if (typeof successFlag !== "number") {
        // KIE occasionally returns { code, message, data: null } for invalid/expired taskIds.
        // Avoid crashing with "Cannot read properties of null (reading 'successFlag')".
        const msg =
          (status as any)?.message ||
          (status as any)?.msg ||
          "Invalid Veo status response (missing data.successFlag)";
        throw new KieAPIError(`[VEO] ${msg}`, 502);
      }

      console.log(`[VEO] Task ${taskId} status: successFlag=${successFlag}`);

      if (successFlag === 1) {
        // Success
        const urlsRaw =
          data.response?.resultUrls ||
          data.info?.resultUrls ||
          [];
        const urls: string[] = Array.isArray(urlsRaw) ? urlsRaw.filter((u: unknown): u is string => typeof u === "string") : [];
        console.log(`[VEO] Task ${taskId} completed with ${urls.length} video(s)`);
        return urls;
      } else if (successFlag === 2 || successFlag === 3) {
        // Failed or invalid
        const errorMsg =
          data.errorMessage ||
          data.info?.errorMsg ||
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
      } else if (params.model.startsWith('grok-imagine/')) {
        // Grok Imagine expects `mode`: normal | fun | spicy
        input.aspect_ratio = params.aspectRatio || '1:1';
        const m = String(params.quality || '').toLowerCase();
        if (m === 'normal' || m === 'fun' || m === 'spicy') {
          input.mode = m;
        } else {
          input.mode = 'normal';
        }
      } else if (params.model.startsWith('seedream/4.5')) {
        // Seedream requires `quality`: basic (2K) / high (4K)
        input.aspect_ratio = params.aspectRatio || '1:1';
        // Accept direct values (basic/high) and keep backward compatibility with Turbo/Balanced/Quality labels.
        const q = String(params.quality || '').toLowerCase();
        if (q === 'high') input.quality = 'high';
        else if (q === 'basic') input.quality = 'basic';
        else input.quality = q === 'quality' || q === 'ultra' ? 'high' : 'basic';
      } else if (params.model === 'z-image' || params.model === 'z-image-turbo') {
        // Z-image Turbo: per docs only prompt + aspect_ratio are required
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
        // Topaz Upscale requires `upscale_factor`
        if (params.model.includes('topaz/')) {
          let factor: number = 2;
          const raw = (params.upscaleFactor ?? params.scale ?? '') as any;
          if (typeof raw === 'number' && Number.isFinite(raw)) factor = raw;
          else {
            const s = String(raw || '').trim().toLowerCase();
            if (s === '4' || s === '4x') factor = 4;
            else factor = 2;
          }
          input.upscale_factor = String(factor);
        }
      }

      if (params.outputFormat) input.output_format = params.outputFormat;
      // Only pass quality for models that explicitly support it
      // Nano Banana Pro uses resolution parameter instead of quality
      // Seedream uses its own quality format (basic/high) handled above
      const skipQualityModels = ['qwen/image-edit', 'nano-banana-pro', 'nano-banana', 'grok-imagine'];
      if (params.quality && !skipQualityModels.some(m => params.model === m || params.model.includes(m)) && !params.model.startsWith('seedream/4.5')) {
        input.quality = params.quality;
      }
      // Handle image inputs for i2i based on model requirements
      if (params.imageInputs && params.imageInputs.length > 0 && params.model !== 'qwen/image-edit') {
        const imgUrl = params.imageInputs[0];
        
        // Default: single reference via image_url.
        // Some models (e.g. FLUX.2) use multi-reference via input_urls instead.
        const isFlux = params.model.includes('flux');
        if (!isFlux) {
          input.image_url = imgUrl;
        }
        // Some tools (e.g. Recraft Remove Background / Topaz Upscale) expect `image` instead of `image_url`.
        if (!isFlux && (params.model.includes('recraft/') || params.model.includes('topaz/'))) {
          input.image = imgUrl;
        }
        
        // Add model-specific parameters
        if (isFlux) {
          // FLUX.2 Pro supports multi-reference via input_urls (1–8)
          input.input_urls = params.imageInputs.slice(0, 8);
          input.strength = 0.75; // 0..1
        } else if (params.model.includes('nano-banana') || params.model.includes('imagen')) {
          // Nano Banana Pro supports up to 8 reference images
          // API expects: image_urls array OR img_url comma-separated string
          // Using array format (image_urls) as it's more explicit and supports multiple refs
          input.init_image = imgUrl; // Fallback for single-image APIs
          input.image_urls = params.imageInputs.slice(0, 8); // Support up to 8 images

          // Also try comma-separated format as fallback (some docs mention img_url)
          if (params.imageInputs.length > 1) {
            input.img_url = params.imageInputs.slice(0, 8).join(',');
          }

          console.log(`[KIE i2i] Nano Banana Pro: sending ${params.imageInputs.length} reference image(s)`)
        } else if (params.model.includes('seedream')) {
          input.strength = 0.7;
        }
        
        console.log('[KIE i2i] Using reference image for model:', params.model);
      }
      
      // Request URL output instead of base64 (reduces response size dramatically)
      input.return_url = true;
      input.output_type = 'url';

      const request: CreateTaskRequest = {
        model: params.model,
        input,
      };
      
      // Add callback URL for async notifications
      const base = this.callbackUrlBase.replace(/\/$/, "");
      const secret = this.callbackSecret;
      if (base && secret) {
        request.callBackUrl = `${base}/api/webhooks/kie?secret=${encodeURIComponent(secret)}`;
      }

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
          console.error("[KIE API] Failed to parse resultJson, trying URL extraction:", e);
          // Try to extract URLs from truncated/invalid JSON
          const urls = extractUrlsFromString(data.resultJson);
          if (urls.length > 0) {
            outputs = urls.map((url) => ({
              url,
              width: 1024,
              height: 1024,
            }));
          }
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
      if (params.provider === 'laozhang') {
        return this.generateLaoZhangVideo(params);
      }

      if (params.provider === 'kie_veo') {
        return this.generateVeoVideo(params);
      }

      return this.generateMarketVideo(params);
    } catch (error) {
      console.error("[KIE API] generateVideo error:", error);
      throw error;
    }
  }

  // === LAOZHANG VIDEO GENERATION ===
  // Routes to LaoZhang.ai API for Veo 3.1 Fast and Sora 2 models
  private async generateLaoZhangVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    console.log('[LAOZHANG] Routing to LaoZhang API:', {
      model: params.model,
      mode: params.mode,
      aspectRatio: params.aspectRatio,
      duration: params.duration,
    });

    // Map model ID to LaoZhang model name
    let laozhangModel = params.model;

    // For Sora models, use aspect ratio and duration to determine variant
    if (params.model === 'sora-2' || params.model === 'sora_video2') {
      const duration = Number(params.duration) || 10;
      const aspectRatio = params.aspectRatio || '9:16';

      if (duration >= 15) {
        laozhangModel = 'sora_video2-15s';
      } else if (aspectRatio === '16:9' || aspectRatio === 'landscape') {
        laozhangModel = 'sora_video2-landscape';
      } else {
        laozhangModel = 'sora_video2'; // Default: portrait 10s
      }
    }

    // Collect image URLs for i2v/start_end modes
    let startImageUrl: string | undefined;
    let endImageUrl: string | undefined;
    let referenceImages: string[] | undefined;

    // For i2v or start_end mode, use imageUrl/imageUrls
    if (params.mode === 'i2v' || params.mode === 'start_end') {
      if (params.imageUrl) {
        startImageUrl = params.imageUrl;
      } else if (params.imageUrls && params.imageUrls.length > 0) {
        startImageUrl = params.imageUrls[0];
      }

      // For start_end mode, also get end frame
      if (params.mode === 'start_end' && params.lastFrameUrl) {
        endImageUrl = params.lastFrameUrl;
      }
    }

    // For ref2v mode (Veo reference images)
    if (params.mode === 'ref2v' && params.referenceImages) {
      referenceImages = [];
      for (const ref of params.referenceImages) {
        const url = typeof ref === 'string' ? ref : ref.url;
        if (url) {
          referenceImages.push(url);
        }
      }
    }

    // Call LaoZhang API
    const laozhangClient = getLaoZhangClient();
    const result = await laozhangClient.generateVideo({
      model: laozhangModel,
      prompt: params.prompt || '',
      startImageUrl,
      endImageUrl,
      referenceImages,
    });

    // Map LaoZhang response to our format
    return {
      id: result.id,
      status: 'completed',
      outputs: [{
        url: result.videoUrl,
        width: 1280,
        height: 720,
        duration: Number(params.duration) || 10,
      }],
    };
  }

  // === VEO 3.1 VIDEO GENERATION ===
  // API Docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
  private async generateVeoVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    // Veo API supports: "16:9", "9:16", "Auto"
    const rawAspect = String(params.aspectRatio || '16:9');
    const veoAspect = rawAspect === '1:1' ? '16:9' : rawAspect;
    console.log('[VEO] Request params:', {
      aspectRatio: params.aspectRatio,
      veoAspect,
      mode: params.mode,
      model: params.model,
      quality: params.quality
    });

    const request: VeoGenerateRequest = {
      prompt: params.prompt || '',
      aspect_ratio: veoAspect, // "16:9" | "9:16" | "Auto"
      model: params.quality === 'fast' ? 'veo3_fast' : 'veo3',
      enableTranslation: true,
    };

    // Determine generationType based on mode and images
    if (params.mode === 'i2v' || params.mode === 'ref2v') {
      // Collect image URLs
      const imageUrls: string[] = [];

      if (params.referenceImages && params.referenceImages.length > 0) {
        params.referenceImages.forEach((ref) => {
          const url = typeof ref === 'string' ? ref : ref.url;
          if (url) imageUrls.push(url);
        });
      } else if (params.imageUrl) {
        imageUrls.push(params.imageUrl);
      } else if (params.imageUrls && params.imageUrls.length > 0) {
        imageUrls.push(...params.imageUrls);
      }

      if (imageUrls.length > 0) {
        request.imageUrls = imageUrls.slice(0, 2); // Max 2 images
        // REFERENCE_2_VIDEO only works with veo3_fast and 16:9
        if (params.mode === 'ref2v' && request.model === 'veo3_fast' && veoAspect === '16:9') {
          request.generationType = 'REFERENCE_2_VIDEO';
        } else {
          // Use FIRST_AND_LAST_FRAMES_2_VIDEO for image-to-video
          // 1 image = movement around it, 2 images = transition between them
          request.generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
        }
        console.log('[VEO] Image mode:', { imageCount: request.imageUrls.length, generationType: request.generationType });
      }
    } else if (params.mode === 'start_end') {
      // First and last frames mode
      const imageUrls: string[] = [];
      if (params.imageUrl) imageUrls.push(params.imageUrl);
      if (params.lastFrameUrl) imageUrls.push(params.lastFrameUrl);

      if (imageUrls.length > 0) {
        request.imageUrls = imageUrls;
        request.generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
        console.log('[VEO] Start/End frames mode:', { imageCount: imageUrls.length });
      }
    } else {
      // Text-to-video mode
      request.generationType = 'TEXT_2_VIDEO';
    }

    // Add callback URL
    const base = this.callbackUrlBase.replace(/\/$/, "");
    const secret = this.veoWebhookSecret || this.callbackSecret;
    if (base && secret) {
      request.callBackUrl = `${base}/api/webhooks/veo?secret=${encodeURIComponent(secret)}`;
    }

    console.log('[VEO] Final request:', JSON.stringify(request, null, 2));
    const response = await this.veoGenerate(request);

    return {
      id: response.data.taskId,
      status: "queued",
      estimatedTime: 180,
    };
  }

  // === MARKET VIDEO GENERATION (Kling, Sora, Bytedance) ===
  private async generateMarketVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    const input: Record<string, unknown> = {};

    // Prompt (always required)
    if (params.prompt) {
      input.prompt = params.prompt;
    }

    // === KLING O3 STANDARD VIDEO EDIT ===
    if (params.model.includes('o3-standard-v2v-edit')) {
      // Video URL (required)
      if (params.videoUrl) {
        input.video_url = params.videoUrl;
      }
      // Optional reference image(s)
      if (params.imageUrl) {
        input.image_urls = [params.imageUrl];
      }
      // Duration as string
      if (params.duration) {
        input.duration = String(params.duration);
      }
      // Keep audio flag
      if ((params as any).keepAudio !== undefined) {
        input.keep_audio = (params as any).keepAudio;
      } else {
        input.keep_audio = true; // default: keep original audio
      }
      console.log('[KIE O3 Edit] Request params:', {
        has_video_url: !!params.videoUrl,
        has_image_url: !!params.imageUrl,
        duration: params.duration,
        prompt: params.prompt?.substring(0, 50),
      });
    }
    // === KLING 2.6 MOTION CONTROL ===
    // Документация: https://kie.ai/kling-2.6-motion-control
    else if (params.model.includes('motion-control')) {
      // input_urls: [reference_image_url, motion_video_url]
      if (params.imageUrl && params.videoUrl) {
        input.input_urls = [params.imageUrl, params.videoUrl];
      }
      // mode: 720p (standard) or 1080p (pro)
      if (params.resolution === '1080p') {
        input.mode = '1080p';
      } else {
        input.mode = '720p'; // Default to standard
      }
      // character_orientation: 'image' or 'video'
      // 'image' = use orientation from reference image (max 10s video)
      // 'video' = use orientation from reference video (max 30s video)
      if (params.characterOrientation) {
        input.character_orientation = params.characterOrientation;
      }
      console.log('[KIE Motion Control] Request params:', {
        input_urls: !!params.imageUrl && !!params.videoUrl,
        mode: input.mode,
        character_orientation: params.characterOrientation || 'image',
        prompt: params.prompt?.substring(0, 50),
      });
    }
    // === KLING 2.6 specific parameters ===
    else if (params.model.includes('kling')) {
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
      // Tail image for pro models (start/end in i2v)
      if (params.lastFrameUrl) {
        input.tail_image_url = params.lastFrameUrl;
      }
      // Advanced: cfg scale
      if (typeof params.cfgScale === 'number') {
        input.cfg_scale = params.cfgScale;
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
    // Документация: https://kie.ai/market (sora-2-pro через Kie.ai)
    else if (params.model.includes('sora')) {
      // For Sora: use n_frames instead of duration (as string)
      if (params.duration) {
        input.n_frames = String(params.duration);
      }
      
      // Aspect ratio: "portrait" or "landscape" (Sora-specific format)
      if (params.aspectRatio) {
        const aspect = params.aspectRatio;
        // Map common ratios to Sora format
        if (aspect === '9:16' || aspect === 'portrait') {
          input.aspect_ratio = 'portrait';
        } else if (aspect === '16:9' || aspect === 'landscape') {
          input.aspect_ratio = 'landscape';
        } else {
          // Default to landscape for other ratios
          input.aspect_ratio = 'landscape';
        }
      }
      
      // Quality/Size for Sora Pro: "standard" or "high"
      if (params.quality) {
        input.size = params.quality;
      } else if (params.resolution) {
        // Map resolution to quality if quality not provided
        input.size = params.resolution === '1080p' ? 'high' : 'standard';
      }
      
      // Image URL for i2v (single image, not array for Sora)
      if ((params.mode === 'i2v' || params.mode === 'start_end') && params.imageUrl) {
        input.image_url = params.imageUrl; // Sora uses singular image_url
      }
      
      // Storyboard mode (if supported)
      if (params.mode === 'storyboard' && params.shots) {
        input.shots = params.shots;
      }
      
      console.log('[KIE Sora 2] Request params:', {
        n_frames: input.n_frames,
        aspect_ratio: input.aspect_ratio,
        size: input.size,
        has_image: !!params.imageUrl,
        mode: params.mode,
      });
    }

    // === WAN specific parameters ===
    else if (params.model.includes('wan/')) {
      if (params.duration) input.duration = String(params.duration);
      if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
      if (params.resolution) input.resolution = params.resolution;
      if (params.sound !== undefined) input.sound = params.sound;

      // I2V: reference image
      if (params.mode === 'i2v' && params.imageUrl) {
        input.image_urls = [params.imageUrl];
      }
      // V2V: reference video URL (KIE model: wan/*-video-to-video)
      if (params.mode === 'v2v' && params.videoUrl) {
        input.video_url = params.videoUrl;
        input.video_urls = [params.videoUrl];
      }
    }

    // === GROK VIDEO specific parameters ===
    // Документация: https://kie.ai/grok-imagine (text-to-video)
    else if (params.model.includes('grok')) {
      // Duration (6s-30s for Grok Video)
      if (params.duration) {
        input.duration = String(params.duration);
      }
      
      // Aspect ratio: 9:16, 1:1, 3:2, 2:3
      if (params.aspectRatio) {
        input.aspect_ratio = params.aspectRatio;
      }
      
      // Style preset (normal, fun, spicy)
      if (params.style && typeof params.style === 'string') {
        input.style_preset = params.style;
      } else if (params.quality && typeof params.quality === 'string') {
        // Backward compatibility: allow quality to pass style
        input.style_preset = params.quality;
      }
      
      // I2V mode: reference image for style transfer
      if (params.mode === 'i2v' && params.imageUrl) {
        input.image_url = params.imageUrl;
      }
      
      // Audio is automatically generated by Grok Video (no param needed)
      console.log('[KIE Grok Video] Request params:', {
        duration: input.duration,
        aspect_ratio: input.aspect_ratio,
        style_preset: input.style_preset,
        has_image: !!params.imageUrl,
        mode: params.mode,
      });
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
          console.error("[KIE API] Failed to parse video resultJson, trying URL extraction:", e);
          // Try to extract URLs from truncated/invalid JSON
          const urls = extractUrlsFromString(data.resultJson);
          if (urls.length > 0) {
            outputs = urls.map((url) => ({
              url,
              width: 1280,
              height: 720,
              duration: 5,
            }));
          }
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
      const data: any = (response as any)?.data;
      const successFlag: number | undefined = typeof data?.successFlag === "number" ? data.successFlag : undefined;
      if (typeof successFlag !== "number") {
        const msg =
          (response as any)?.message ||
          (response as any)?.msg ||
          "Invalid Veo status response (missing data.successFlag)";
        // Return a non-crashing "failed" status so polling endpoints don't explode on null data.
        return {
          id: taskId,
          status: "failed",
          progress: 0,
          outputs: [],
          error: `[VEO] ${msg}`,
        };
      }

      let outputs: GenerateVideoResponse["outputs"];
      let status: GenerationStatus = "processing";
      let progress = 50;
      let error: string | undefined;

      if (successFlag === 1) {
        // Success
        status = "completed";
        progress = 100;
        const urlsRaw =
          data.response?.resultUrls ||
          data.info?.resultUrls ||
          [];
        let urls: string[] = Array.isArray(urlsRaw) ? urlsRaw.filter((u: unknown): u is string => typeof u === "string") : [];

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
      } else if (successFlag === 2 || successFlag === 3) {
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
      const response = await fetchWithTimeout(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=test`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000, // 10s for health check
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
    
    const m = String(request.model || "").toLowerCase();
    const isVideo =
      m.includes("text-to-video") ||
      m.includes("image-to-video") ||
      m.includes("video-to-video") ||
      m.includes("sora") ||
      m.includes("kling") ||
      m.includes("wan") ||
      m.includes("luma") ||
      m.includes("runway") ||
      m.includes("veo") ||
      m.includes("bytedance");
    
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

export function getKieConfig(opts?: { scope?: KieKeyScope; slot?: number | null }) {
  const scope = opts?.scope || "default";
  const slot = typeof opts?.slot === "number" ? opts!.slot : null;

  // Evaluate env only when KIE integration is actually used.
  // Allow separate keys for photo/video, but keep KIE_API_KEY as fallback.
  const scopedVar =
    scope === "photo" ? "KIE_API_KEY_PHOTO" : scope === "video" ? "KIE_API_KEY_VIDEO" : null;

  // Optional: key pools per scope. Example:
  // KIE_API_KEY_PHOTO_POOL="key1,key2,key3"
  // KIE_API_KEY_VIDEO_POOL="keyA keyB"
  const poolEnv =
    scope === "photo"
      ? env.optional("KIE_API_KEY_PHOTO_POOL")
      : scope === "video"
        ? env.optional("KIE_API_KEY_VIDEO_POOL")
        : undefined;
  const pool = parseKeyPool(poolEnv);
  const poolKey =
    pool.length && slot != null && slot >= 0 && slot < pool.length ? pool[slot] : "";

  const apiKey = poolKey || (scopedVar ? env.optional(scopedVar) : "") || env.optional("KIE_API_KEY") || "";
  // Callbacks are optional - KIE uses polling by default
  const callbackSecret = env.optional("KIE_CALLBACK_SECRET") || "";
  const callbackUrlBase = env.optional("KIE_CALLBACK_URL") || "";
  const baseUrl = env.optional("NEXT_PUBLIC_KIE_API_URL") || "https://api.kie.ai";
  const mockMode = env.bool("NEXT_PUBLIC_MOCK_MODE");
  const veoWebhookSecret = env.optional("VEO_WEBHOOK_SECRET") || undefined;

  const missing: string[] = [];
  if (!apiKey) missing.push(scopedVar || "KIE_API_KEY");
  // Callbacks no longer required - polling is used instead

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

const _kieClients = new Map<string, KieAIClient>();

export function getKieClient(opts?: { scope?: KieKeyScope; slot?: number | null }): KieAIClient {
  const cfg = getKieConfig({ scope: opts?.scope || "default", slot: opts?.slot ?? null });

  // In dev we return 501 from handlers if not configured.
  // In prod env.required already throws.
  if (!cfg.mockMode && cfg.missing.length) {
    throw new Error(`[KIE] not configured: ${cfg.missing.join(", ")}`);
  }

  const key = JSON.stringify([cfg.baseUrl, cfg.apiKey, cfg.callbackUrlBase, cfg.callbackSecret, cfg.mockMode]);
  const cached = _kieClients.get(key);
  if (cached) return cached;

  const client = new KieAIClient({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    callbackSecret: cfg.callbackSecret,
    callbackUrlBase: cfg.callbackUrlBase,
    veoWebhookSecret: cfg.veoWebhookSecret,
    mockMode: cfg.mockMode || !cfg.apiKey,
  });
  _kieClients.set(key, client);
  return client;
}
