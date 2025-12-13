import type { AIModel } from "@/types/generator";

// ===== REQUEST TYPES =====

export interface GenerateImageRequest {
  model: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  numOutputs?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  sampler?: string;
}

export interface GenerateVideoRequest {
  model: string;
  prompt?: string;
  imageUrl?: string;
  duration: number;
  width: number;
  height: number;
  fps?: number;
  cameraMovement?: string;
  motionIntensity?: number;
}

// ===== RESPONSE TYPES =====

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerateImageResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    width: number;
    height: number;
    seed: number;
  }[];
  error?: string;
}

export interface GenerateVideoResponse {
  id: string;
  status: GenerationStatus;
  progress?: number;
  estimatedTime?: number;
  outputs?: {
    url: string;
    thumbnailUrl: string;
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

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  retryOnStatuses?: number[];
}

class KieAIClient {
  private baseUrl: string;
  private apiKey: string;
  private isMockMode: boolean;
  private defaultRetryOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
  };

  // Track mock generation progress
  private mockProgress: Map<string, { startTime: number; duration: number }> = new Map();

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || "https://api.kie.ai";
    this.apiKey = process.env.KIE_API_KEY || "";
    this.isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true" || !this.apiKey;

    if (this.isMockMode) {
      console.warn("[KIE API] Running in MOCK MODE - no real API calls will be made");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log("[KIE API] Request:", { 
      url, 
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("[KIE API] Error:", error);
        throw new KieAPIError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error.code
        );
      }

      const data = await response.json();
      console.log("[KIE API] Response:", data);
      return data;
    } catch (error) {
      console.error("[KIE API] Request failed:", error);
      throw error;
    }
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
  ): Promise<T> {
    const { maxRetries, baseDelay, retryOnStatuses } = {
      ...this.defaultRetryOptions,
      ...retryOptions,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const shouldRetry =
          attempt < maxRetries &&
          error instanceof KieAPIError &&
          retryOnStatuses.includes(error.status);

        if (!shouldRetry) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(
          `[KIE API] Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===== IMAGE GENERATION =====

  async generateImage(params: GenerateImageRequest): Promise<GenerateImageResponse> {
    if (this.isMockMode) {
      return this.mockGenerateImage(params);
    }

    return this.requestWithRetry<GenerateImageResponse>("/v1/images/generations", {
      method: "POST",
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width: params.width,
        height: params.height,
        num_outputs: params.numOutputs || 1,
        guidance_scale: params.cfgScale || 7.5,
        num_inference_steps: params.steps || 30,
        seed: params.seed,
        scheduler: params.sampler,
      }),
    });
  }

  async getGenerationStatus(id: string): Promise<GenerateImageResponse> {
    if (this.isMockMode) {
      return this.mockGetImageStatus(id);
    }

    return this.requestWithRetry<GenerateImageResponse>(
      `/v1/images/generations/${id}`,
      {},
      { maxRetries: 2, baseDelay: 500 }
    );
  }

  // ===== VIDEO GENERATION =====

  async generateVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    if (this.isMockMode) {
      return this.mockGenerateVideo(params);
    }

    return this.requestWithRetry<GenerateVideoResponse>("/v1/videos/generations", {
      method: "POST",
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
        image_url: params.imageUrl,
        duration: params.duration,
        width: params.width,
        height: params.height,
        fps: params.fps || 30,
        camera_movement: params.cameraMovement,
        motion_intensity: params.motionIntensity,
      }),
    });
  }

  async getVideoGenerationStatus(id: string): Promise<GenerateVideoResponse> {
    if (this.isMockMode) {
      return this.mockGetVideoStatus(id);
    }

    return this.requestWithRetry<GenerateVideoResponse>(
      `/v1/videos/generations/${id}`,
      {},
      { maxRetries: 2, baseDelay: 500 }
    );
  }

  // ===== MOCK IMPLEMENTATIONS =====

  private async mockGenerateImage(params: GenerateImageRequest): Promise<GenerateImageResponse> {
    console.log("[MOCK] Generating image with params:", params);

    // Simulate API latency
    await this.sleep(800 + Math.random() * 400);

    const id = `mock_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track progress for this generation (30 seconds for image)
    this.mockProgress.set(id, { 
      startTime: Date.now(), 
      duration: 15000 + Math.random() * 10000 // 15-25 seconds
    });

    return {
      id,
      status: "processing",
      progress: 0,
      estimatedTime: 20,
    };
  }

  private async mockGetImageStatus(id: string): Promise<GenerateImageResponse> {
    const progressInfo = this.mockProgress.get(id);
    
    if (!progressInfo) {
      // If no progress info, assume it's a new check - return completed
      return {
        id,
        status: "completed",
        progress: 100,
        outputs: this.generateMockImageOutputs(id),
      };
    }

    const elapsed = Date.now() - progressInfo.startTime;
    const progress = Math.min(100, Math.floor((elapsed / progressInfo.duration) * 100));

    // Simulate occasional processing updates
    await this.sleep(100 + Math.random() * 200);

    if (progress >= 100) {
      this.mockProgress.delete(id);
      return {
        id,
        status: "completed",
        progress: 100,
        outputs: this.generateMockImageOutputs(id),
      };
    }

    return {
      id,
      status: "processing",
      progress,
      estimatedTime: Math.ceil((progressInfo.duration - elapsed) / 1000),
    };
  }

  private generateMockImageOutputs(id: string) {
    // Use variety of placeholder images
    const placeholders = [
      `https://picsum.photos/seed/${id}/1024/1024`,
      `https://source.unsplash.com/random/1024x1024?ai,art&sig=${id}`,
    ];
    
    return [
      {
        url: placeholders[0],
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 999999999),
      },
    ];
  }

  private async mockGenerateVideo(params: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    console.log("[MOCK] Generating video with params:", params);

    await this.sleep(1000 + Math.random() * 500);

    const id = `mock_vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track progress (video takes longer - based on duration)
    const baseDuration = (params.duration || 5) * 8000; // ~8 seconds per second of video
    this.mockProgress.set(id, { 
      startTime: Date.now(), 
      duration: baseDuration + Math.random() * 10000
    });

    return {
      id,
      status: "processing",
      progress: 0,
      estimatedTime: Math.ceil(baseDuration / 1000),
    };
  }

  private async mockGetVideoStatus(id: string): Promise<GenerateVideoResponse> {
    const progressInfo = this.mockProgress.get(id);
    
    if (!progressInfo) {
      return {
        id,
        status: "completed",
        progress: 100,
        outputs: this.generateMockVideoOutputs(id),
      };
    }

    const elapsed = Date.now() - progressInfo.startTime;
    const progress = Math.min(100, Math.floor((elapsed / progressInfo.duration) * 100));

    await this.sleep(100 + Math.random() * 200);

    if (progress >= 100) {
      this.mockProgress.delete(id);
      return {
        id,
        status: "completed",
        progress: 100,
        outputs: this.generateMockVideoOutputs(id),
      };
    }

    return {
      id,
      status: "processing",
      progress,
      estimatedTime: Math.ceil((progressInfo.duration - elapsed) / 1000),
    };
  }

  private generateMockVideoOutputs(id: string) {
    // Sample videos for testing
    const sampleVideos = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    ];

    return [
      {
        url: sampleVideos[Math.floor(Math.random() * sampleVideos.length)],
        thumbnailUrl: `https://picsum.photos/seed/${id}/1280/720`,
        width: 1280,
        height: 720,
        duration: 5,
      },
    ];
  }

  // ===== UTILITIES =====

  async checkHealth(): Promise<boolean> {
    if (this.isMockMode) {
      return true;
    }

    try {
      await this.request("/health");
      return true;
    } catch {
      return false;
    }
  }

  async getAccountBalance(): Promise<{ credits: number }> {
    if (this.isMockMode) {
      return { credits: 847 }; // Mock credits
    }

    return this.requestWithRetry("/v1/account/balance");
  }

  // Check if running in mock mode
  isInMockMode(): boolean {
    return this.isMockMode;
  }

  // ===== STATIC UTILITIES =====

  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }
}

// Singleton instance
export const kieClient = new KieAIClient();

// ===== HELPER FUNCTIONS =====

export function aspectRatioToSize(
  aspectRatio: string,
  baseSize: number = 1024
): { width: number; height: number } {
  const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number);
  const maxRatio = Math.max(widthRatio, heightRatio);

  return {
    width: Math.round(baseSize * (widthRatio / maxRatio)),
    height: Math.round(baseSize * (heightRatio / maxRatio)),
  };
}

export function calculateCredits(
  model: AIModel,
  variants: number = 1,
  isHD: boolean = false
): number {
  let cost = model.creditCost * variants;
  if (isHD) cost *= 1.5;
  return Math.ceil(cost);
}

// Video duration credit multiplier
export function calculateVideoCredits(
  baseCost: number,
  duration: number
): number {
  // Cost scales with duration (5s = base, 10s = 2x, 20s = 4x)
  const multiplier = duration / 5;
  return Math.ceil(baseCost * multiplier);
}
