/**
 * ===== EXTENDED KIE.AI CLIENT =====
 * Full-featured client for Kie.ai API with all models and helpers
 * Documentation: https://docs.kie.ai
 * 
 * Two API endpoints:
 * 1. Market API: POST /api/v1/jobs/createTask (most models)
 * 2. Veo 3.1 API: POST /api/v1/veo/generate (Veo only)
 */

// ===== MODEL ENUMS =====

export enum KiePhotoModel {
  // Available models (tested)
  NANO_BANANA = 'google/nano-banana',
  IMAGEN_4 = 'google/imagen4',
  
  // Premium models (require higher tier subscription)
  SEEDREAM_45 = 'seedream/4.5-text-to-image',
  FLUX_2_PRO = 'flux/2-pro-text-to-image',
  NANO_BANANA_PRO = 'google/nano-banana-pro',
  Z_IMAGE = 'z-image/text-to-image',
  IDEOGRAM_V3_TURBO = 'ideogram/v3-text-to-image-turbo',
  IDEOGRAM_V3 = 'ideogram/v3-text-to-image',
  QWEN_IMAGE_EDIT = 'qwen/image-edit',
}

export enum KieVideoModel {
  // Veo 3.1 (separate API)
  VEO_3 = 'veo3',
  VEO_3_FAST = 'veo3_fast',
  
  // Market API - Available
  KLING_2_6_T2V = 'kling-2.6/text-to-video',
  KLING_2_6_I2V = 'kling-2.6/image-to-video',
  SORA_2_I2V = 'sora-2-image-to-video',
  SORA_2_PRO_I2V = 'sora-2-pro-image-to-video',
  SORA_2_PRO_STORYBOARD = 'sora-2-pro-storyboard',
  
  // Premium
  BYTEDANCE_V1_PRO = 'bytedance/v1-pro-image-to-video',
}

export type KieModel = KiePhotoModel | KieVideoModel;

// ===== REQUEST/RESPONSE TYPES =====

export interface KieTaskRequest {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
}

export interface KieTaskResponse {
  code: number;
  msg: string;
  message?: string;
  data: {
    taskId: string;
    recordId?: string;
  };
}

export interface KieTaskInfo {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
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

export interface KieTaskResult {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resultUrls?: string[];
  error?: string;
  metadata?: {
    model: string;
    costTime?: number;
    completeTime?: number;
  };
}

// ===== VEO TYPES =====

export interface VeoGenerateRequest {
  prompt: string;
  model?: 'veo3' | 'veo3_fast';
  aspectRatio?: string;
  enhancePrompt?: boolean;
  imageUrls?: string[];
  callBackUrl?: string;
}

export interface VeoGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface VeoRecordInfo {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0=processing, 1=success, 2=failed, 3=invalid
    info?: {
      resultUrls?: string[];
      errorMsg?: string;
    };
  };
}

// ===== MAIN CLIENT CLASS =====

export class KieClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || 'https://api.kie.ai';
    this.apiKey = apiKey || process.env.KIE_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('KIE_API_KEY is required');
    }
  }

  // ===== CORE METHODS =====

  /**
   * Create a new task
   * POST /api/v1/jobs/createTask
   */
  async createTask(request: KieTaskRequest): Promise<KieTaskResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || data.message || `API Error: ${data.code}`);
    }

    return data;
  }

  /**
   * Get task info
   * GET /api/v1/jobs/recordInfo?taskId=xxx
   */
  async getTaskInfo(taskId: string): Promise<KieTaskInfo> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || `Failed to get task info: ${data.code}`);
    }

    return data;
  }

  /**
   * Wait for task result with polling
   * @param taskId - Task ID to poll
   * @param maxWaitMs - Maximum wait time in milliseconds (default: 5 minutes)
   * @param pollIntervalMs - Polling interval in milliseconds (default: 5 seconds)
   */
  async waitForResult(
    taskId: string,
    maxWaitMs: number = 5 * 60 * 1000,
    pollIntervalMs: number = 5000
  ): Promise<KieTaskResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const info = await this.getTaskInfo(taskId);
      const { data } = info;

      console.log(`[KIE] Task ${taskId} state: ${data.state}`);

      if (data.state === 'success') {
        // Parse result
        let resultUrls: string[] = [];
        if (data.resultJson) {
          try {
            const result = JSON.parse(data.resultJson);
            resultUrls = result.resultUrls || [];
          } catch (e) {
            console.error('[KIE] Failed to parse resultJson:', e);
          }
        }

        return {
          taskId,
          status: 'completed',
          resultUrls,
          metadata: {
            model: data.model,
            costTime: data.costTime,
            completeTime: data.completeTime,
          },
        };
      } else if (data.state === 'fail') {
        return {
          taskId,
          status: 'failed',
          error: data.failMsg || 'Generation failed',
          metadata: {
            model: data.model,
          },
        };
      }

      // Still processing
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout
    throw new Error(`Task timeout after ${maxWaitMs}ms`);
  }

  // ===== VEO 3.1 METHODS =====

  /**
   * Generate video with Veo 3.1
   * POST /api/v1/veo/generate
   */
  async veoGenerate(request: VeoGenerateRequest): Promise<VeoGenerateResponse> {
    const requestBody = {
      ...request,
      model: request.model || 'veo3',
    };

    const response = await fetch(`${this.baseUrl}/api/v1/veo/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || `Veo API Error: ${data.code}`);
    }

    return data;
  }

  /**
   * Get Veo task status
   * GET /api/v1/veo/record-info?taskId=xxx
   */
  async veoGetStatus(taskId: string): Promise<VeoRecordInfo> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/veo/record-info?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || `Failed to get Veo status: ${data.code}`);
    }

    return data;
  }

  /**
   * Wait for Veo result
   */
  async veoWaitForResult(
    taskId: string,
    maxWaitMs: number = 10 * 60 * 1000,
    pollIntervalMs: number = 30000
  ): Promise<string[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.veoGetStatus(taskId);

      console.log(`[VEO] Task ${taskId} successFlag: ${status.data.successFlag}`);

      if (status.data.successFlag === 1) {
        // Success
        return status.data.info?.resultUrls || [];
      } else if (status.data.successFlag === 2 || status.data.successFlag === 3) {
        // Failed
        const error = status.data.info?.errorMsg || 'Video generation failed';
        throw new Error(error);
      }

      // Still processing
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Veo task timeout after ${maxWaitMs}ms`);
  }

  /**
   * Get 1080p version of Veo video
   * GET /api/v1/veo/get-1080p-video?taskId=xxx
   */
  async veoGet1080p(taskId: string): Promise<{ video1080pUrl?: string; status?: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/veo/get-1080p-video?taskId=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || `Failed to get 1080p: ${data.code}`);
    }

    return data.data || {};
  }

  // ===== HELPER METHODS =====

  /**
   * Text to Image
   * Generate image from text prompt
   */
  async textToImage(params: {
    model: KiePhotoModel;
    prompt: string;
    aspectRatio?: string;
    resolution?: '1K' | '2K' | '4K';
    outputFormat?: 'png' | 'jpg';
    quality?: 'fast' | 'ultra';
    callBackUrl?: string;
  }): Promise<KieTaskResponse> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
    if (params.resolution) input.resolution = params.resolution;
    if (params.outputFormat) input.output_format = params.outputFormat;
    if (params.quality) input.quality = params.quality;

    return this.createTask({
      model: params.model,
      input,
      callBackUrl: params.callBackUrl,
    });
  }

  /**
   * Image to Image
   * Edit/transform existing image
   */
  async imageToImage(params: {
    model: KiePhotoModel;
    prompt: string;
    imageUrls: string[];
    aspectRatio?: string;
    callBackUrl?: string;
  }): Promise<KieTaskResponse> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      image_input: params.imageUrls,
    };

    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;

    return this.createTask({
      model: params.model,
      input,
      callBackUrl: params.callBackUrl,
    });
  }

  /**
   * Text to Video
   * Generate video from text prompt
   */
  async textToVideo(params: {
    model: KieVideoModel;
    prompt: string;
    duration?: string | number;
    aspectRatio?: string;
    sound?: boolean;
    callBackUrl?: string;
  }): Promise<KieTaskResponse | VeoGenerateResponse> {
    // Veo uses different API
    if (params.model === KieVideoModel.VEO_3 || params.model === KieVideoModel.VEO_3_FAST) {
      return this.veoGenerate({
        prompt: params.prompt,
        model: params.model,
        aspectRatio: params.aspectRatio || '16:9',
        enhancePrompt: true,
        callBackUrl: params.callBackUrl,
      });
    }

    // Market API
    const input: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (params.duration) input.duration = String(params.duration);
    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
    if (params.sound !== undefined) input.sound = params.sound;

    return this.createTask({
      model: params.model,
      input,
      callBackUrl: params.callBackUrl,
    });
  }

  /**
   * Image to Video
   * Animate existing image
   */
  async imageToVideo(params: {
    model: KieVideoModel;
    prompt: string;
    imageUrl: string;
    duration?: string | number;
    aspectRatio?: string;
    resolution?: '480p' | '720p' | '1080p';
    callBackUrl?: string;
  }): Promise<KieTaskResponse | VeoGenerateResponse> {
    // Veo uses different API
    if (params.model === KieVideoModel.VEO_3 || params.model === KieVideoModel.VEO_3_FAST) {
      return this.veoGenerate({
        prompt: params.prompt,
        model: params.model,
        imageUrls: [params.imageUrl],
        aspectRatio: params.aspectRatio || '16:9',
        enhancePrompt: true,
        callBackUrl: params.callBackUrl,
      });
    }

    // Market API
    const input: Record<string, unknown> = {
      prompt: params.prompt,
    };

    // Different models use different field names for image
    if (params.model.includes('bytedance')) {
      input.image_url = params.imageUrl; // Bytedance uses singular
    } else {
      input.image_urls = [params.imageUrl]; // Others use array
    }

    if (params.duration) input.duration = String(params.duration);
    if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
    if (params.resolution) input.resolution = params.resolution;

    // For Sora, use n_frames instead of duration
    if (params.model.includes('sora') && params.duration) {
      input.n_frames = String(params.duration);
      delete input.duration;
    }

    return this.createTask({
      model: params.model,
      input,
      callBackUrl: params.callBackUrl,
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Check account credits
   * GET /api/v1/chat/credit
   */
  async getCredits(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/api/v1/chat/credit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to get credits');
    }

    return data.data?.balance || 0;
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/jobs/recordInfo?taskId=test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.status !== 500;
    } catch {
      return false;
    }
  }
}

// ===== SINGLETON INSTANCE =====
export const kieClientExtended = new KieClient();
