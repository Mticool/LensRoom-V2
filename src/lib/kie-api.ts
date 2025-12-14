/**
 * KIE.AI API Client
 * Based on https://docs.kie.ai/
 * 
 * Main APIs:
 * - Flux Kontext: POST /api/v1/flux/kontext/generate
 * - GPT-4o Image: POST /api/v1/gpt4o-image/generate
 * - Veo3 Video: POST /api/v1/veo/generate
 * - Runway Video: POST /api/v1/runway/generate
 * - Luma: POST /api/v1/luma/generate
 * - File Upload: POST /api/v1/tool/upload-file
 * 
 * Market API (Universal):
 * - Create Task: POST /api/v1/jobs/createTask
 * - Get Status: GET /api/v1/jobs/recordInfo?taskId=xxx
 * 
 * Available Market Models:
 * - Image: google/nano-banana, nano-banana-pro, google/nano-banana-edit
 * - Image: recraft/remove-background, recraft/crisp-upscale, ideogram/v3-reframe
 * - Video: sora-2-image-to-video, sora-2-text-to-video, sora-2-pro-text-to-video, sora-2-pro-image-to-video
 * - Video: wan/2-2-a14b-image-to-video-turbo, hailuo/2-3-image-to-video-pro
 * - Video: kling-2.6/text-to-video, kling-2.6/image-to-video
 */

// ============ Types ============

export interface GenerateImageParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  seed?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  styleReference?: string;
  characterReference?: string[];
  sourceImage?: string;
}

export interface GenerateVideoParams {
  model: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  fps?: number;
  firstFrame?: string;
  lastFrame?: string;
  cameraControl?: {
    movement: string;
    speed: number;
  };
  audioFile?: string;
  motionIntensity?: number;
  quality?: string;
  resolution?: string;
  sound?: boolean;
}

export interface GenerateProductParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  productImage: string;
  aspectRatio?: string;
  scene?: string;
}

export interface MarketTaskParams {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
}

export interface GenerationResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  estimatedTime?: number;
}

export interface StatusResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  results?: string[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// ============ API Client ============

export class KieAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.KIE_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.kie.ai/api/v1';
    
    if (typeof window === 'undefined') {
      console.log('[KIE API] Initialized with baseUrl:', this.baseUrl);
    }
  }

  // ============ Image Generation ============

  async generateImage(params: GenerateImageParams): Promise<GenerationResponse> {
    try {
      const model = params.model.toLowerCase();
      
      // Route to appropriate API
      if (model.includes('gpt') || model.includes('4o') || model.includes('dall-e')) {
        return this.generateWithGPT4o(params);
      }
      
      // Nano Banana (Google) - Market API
      if (model.includes('nano') || model.includes('banana')) {
        return this.generateWithNanoBanana(params);
      }
      
      if (model.includes('ideogram')) {
        return this.generateWithMarket({
          model: 'ideogram/v3-reframe',
          input: {
            image_url: params.sourceImage,
            prompt: params.prompt,
            image_size: this.mapAspectRatioToIdeogram(params.aspectRatio),
            rendering_speed: 'BALANCED',
            style: 'AUTO',
            num_images: String(params.numImages || 1),
          }
        });
      }
      
      return this.generateWithFlux(params);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Image generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Nano Banana (Google) - Market API ============

  private async generateWithNanoBanana(params: GenerateImageParams): Promise<GenerationResponse> {
    const hasImage = !!params.sourceImage;
    
    // Choose model based on whether we have source image
    let model = 'google/nano-banana';
    if (hasImage) {
      model = params.model.includes('edit') ? 'google/nano-banana-edit' : 'nano-banana-pro';
    } else if (params.model.includes('pro')) {
      model = 'nano-banana-pro';
    }

    const aspectRatioMap: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
    };

    const input: Record<string, unknown> = {
      prompt: params.prompt,
      output_format: 'png',
      image_size: aspectRatioMap[params.aspectRatio || '1:1'] || '1:1',
    };

    // For Pro model with image input
    if (model === 'nano-banana-pro' && hasImage) {
      input.image_input = [params.sourceImage];
      input.aspect_ratio = aspectRatioMap[params.aspectRatio || '1:1'] || '1:1';
      input.resolution = '1K';
      delete input.image_size;
    }

    // For Edit model
    if (model === 'google/nano-banana-edit' && hasImage) {
      input.image_urls = [params.sourceImage];
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Flux Kontext API ============

  private async generateWithFlux(params: GenerateImageParams): Promise<GenerationResponse> {
    try {
      const modelMap: Record<string, string> = {
        'flux-1.1-pro': 'flux-kontext-pro',
        'flux-pro': 'flux-kontext-pro',
        'flux-dev': 'flux-kontext-pro',
        'flux-schnell': 'flux-kontext-pro',
        'flux-kontext': 'flux-kontext-pro',
        'flux-kontext-pro': 'flux-kontext-pro',
        'flux-kontext-max': 'flux-kontext-max',
      };

      const fluxModel = modelMap[params.model] || 'flux-kontext-pro';
      const aspectRatio = this.mapAspectRatio(params.aspectRatio);
      const numImages = params.numImages || 1;

      console.log('[Flux API] Request:', { prompt: params.prompt, model: fluxModel, aspectRatio, numImages });

      // Flux doesn't support multiple images, so we create multiple tasks
      const taskIds: string[] = [];
      
      for (let i = 0; i < numImages; i++) {
        const response = await fetch(`${this.baseUrl}/flux/kontext/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            prompt: params.prompt,
            model: fluxModel,
            aspectRatio: aspectRatio,
            inputImage: params.sourceImage || params.styleReference,
            enableTranslation: true,
            outputFormat: 'jpeg',
            promptUpsampling: true,
            seed: params.seed ? params.seed + i : undefined, // Different seed for each image
          }),
        });

        const data = await response.json();
        console.log(`[Flux API] Response ${i + 1}:`, JSON.stringify(data));

        if (data.code !== 200) {
          throw new Error(data.msg || data.message || 'Flux image generation failed');
        }

        if (data.data?.taskId) {
          taskIds.push(data.data.taskId);
        }
      }

      // Return first taskId, but store all for batch processing
      return { 
        success: true, 
        taskId: taskIds.length > 1 ? taskIds.join(',') : taskIds[0],
        estimatedTime: 30 * numImages,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Flux generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ GPT-4o Image API ============

  private async generateWithGPT4o(params: GenerateImageParams): Promise<GenerationResponse> {
    try {
      const aspectRatioMap: Record<string, string> = {
        '1:1': '1:1',
        '16:9': '3:2',
        '9:16': '2:3',
        '4:3': '3:2',
        '3:4': '2:3',
      };

      const size = aspectRatioMap[params.aspectRatio || '1:1'] || '1:1';

      console.log('[GPT-4o API] Request:', { prompt: params.prompt, size });

      const requestBody: Record<string, unknown> = {
        prompt: params.prompt,
        size: size,
        nVariants: params.numImages || 1,
        isEnhance: true,
      };

      if (params.sourceImage) {
        requestBody.filesUrl = [params.sourceImage];
      }

      const response = await fetch(`${this.baseUrl}/gpt4o-image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('[GPT-4o API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || data.message || 'GPT-4o image generation failed');
      }

      return { 
        success: true, 
        taskId: data.data?.taskId,
        estimatedTime: 60,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('GPT-4o generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Video Generation ============

  async generateVideo(params: GenerateVideoParams): Promise<GenerationResponse> {
    try {
      const model = params.model.toLowerCase();
      
      // Route to Market API for specific models
      if (model.includes('sora')) {
        return this.generateWithSora(params);
      }
      if (model.includes('kling')) {
        return this.generateWithKling(params);
      }
      if (model.includes('hailuo') || model.includes('minimax')) {
        return this.generateWithHailuo(params);
      }
      if (model.includes('wan')) {
        return this.generateWithWan(params);
      }
      if (model.includes('runway')) {
        return this.generateWithRunway(params);
      }
      if (model.includes('luma') || model.includes('ray')) {
        return this.generateWithLuma(params);
      }
      
      // Default to Veo3
      return this.generateWithVeo(params);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Video generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Veo3 Video API ============

  private async generateWithVeo(params: GenerateVideoParams): Promise<GenerationResponse> {
    try {
      const modelMap: Record<string, string> = {
        'veo-3': 'veo3',
        'veo-3-fast': 'veo3_fast',
        'veo3': 'veo3',
        'veo3-fast': 'veo3_fast',
        'veo3_fast': 'veo3_fast',
      };

      const kieModel = modelMap[params.model] || 'veo3_fast';

      let generationType = 'TEXT_2_VIDEO';
      const imageUrls: string[] = [];

      if (params.firstFrame && params.lastFrame) {
        generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
        imageUrls.push(params.firstFrame, params.lastFrame);
      } else if (params.firstFrame) {
        generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
        imageUrls.push(params.firstFrame);
      }

      const aspectRatio = params.aspectRatio === '9:16' ? '9:16' : '16:9';

      console.log('[Veo API] Request:', { prompt: params.prompt, model: kieModel, aspectRatio, generationType });

      const response = await fetch(`${this.baseUrl}/veo/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          model: kieModel,
          aspectRatio: aspectRatio,
          generationType,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          enableTranslation: true,
        }),
      });

      const data = await response.json();
      console.log('[Veo API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || data.message || 'Veo video generation failed');
      }

      return { 
        success: true, 
        taskId: data.data?.taskId,
        estimatedTime: 120,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Veo generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Sora2 Video (Market API) ============

  private async generateWithSora(params: GenerateVideoParams): Promise<GenerationResponse> {
    const hasImage = !!params.firstFrame;
    const isPro = params.model.toLowerCase().includes('pro') || params.quality === 'high';
    
    // Choose model: standard or pro, image-to-video or text-to-video
    let model: string;
    if (isPro) {
      model = hasImage ? 'sora-2-pro-image-to-video' : 'sora-2-pro-text-to-video';
    } else {
      model = hasImage ? 'sora-2-image-to-video' : 'sora-2-text-to-video';
    }
    
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio === '9:16' ? 'portrait' : 'landscape',
      n_frames: String(params.duration === 10 || params.duration === 15 ? 15 : 10),
      remove_watermark: true,
    };

    // Pro model additional options
    if (isPro) {
      input.size = 'high'; // standard or high
    }

    if (hasImage) {
      input.image_urls = [params.firstFrame];
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Kling Video (Market API) ============

  private async generateWithKling(params: GenerateVideoParams): Promise<GenerationResponse> {
    const hasImage = !!params.firstFrame;
    const model = hasImage ? 'kling-2.6/image-to-video' : 'kling-2.6/text-to-video';
    
    const aspectRatioMap: Record<string, string> = {
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1',
    };

    const input: Record<string, unknown> = {
      prompt: params.prompt,
      aspect_ratio: aspectRatioMap[params.aspectRatio || '16:9'] || '16:9',
      duration: String(params.duration || 5),
      sound: params.sound || false,
    };

    if (hasImage) {
      input.image_url = params.firstFrame;
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Hailuo Video (Market API) ============

  private async generateWithHailuo(params: GenerateVideoParams): Promise<GenerationResponse> {
    const hasImage = !!params.firstFrame;
    const model = hasImage ? 'hailuo/2-3-image-to-video-pro' : 'hailuo/2-3-text-to-video-pro';
    
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      duration: String(params.duration || 6),
      resolution: params.resolution || '768P',
    };

    if (hasImage) {
      input.image_url = params.firstFrame;
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Wan Video (Market API) ============

  private async generateWithWan(params: GenerateVideoParams): Promise<GenerationResponse> {
    const hasImage = !!params.firstFrame;
    const model = hasImage ? 'wan/2-2-a14b-image-to-video-turbo' : 'wan/2-2-a14b-text-to-video-turbo';
    
    const aspectRatioMap: Record<string, string> = {
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1',
    };

    const input: Record<string, unknown> = {
      prompt: params.prompt,
      resolution: params.resolution || '720p',
      aspect_ratio: aspectRatioMap[params.aspectRatio || '16:9'] || 'auto',
      enable_prompt_expansion: true,
      acceleration: 'none',
    };

    if (hasImage) {
      input.image_url = params.firstFrame;
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Runway Video API ============

  private async generateWithRunway(params: GenerateVideoParams): Promise<GenerationResponse> {
    try {
      const aspectRatioMap: Record<string, string> = {
        '16:9': '16:9',
        '9:16': '9:16',
        '4:3': '4:3',
        '1:1': '1:1',
      };

      console.log('[Runway API] Request:', { prompt: params.prompt });

      const requestBody: Record<string, unknown> = {
        prompt: params.prompt,
        duration: params.duration || 5,
        quality: params.quality || '720p',
        aspectRatio: aspectRatioMap[params.aspectRatio || '16:9'] || '16:9',
        waterMark: '',
      };

      if (params.firstFrame) {
        requestBody.imageUrl = params.firstFrame;
      }

      const response = await fetch(`${this.baseUrl}/runway/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('[Runway API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || data.message || 'Runway video generation failed');
      }

      return { 
        success: true, 
        taskId: data.data?.taskId,
        estimatedTime: 120,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Runway generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Luma Video API ============

  private async generateWithLuma(params: GenerateVideoParams): Promise<GenerationResponse> {
    try {
      console.log('[Luma API] Request:', { prompt: params.prompt });

      const requestBody: Record<string, unknown> = {
        prompt: params.prompt,
      };

      let endpoint = `${this.baseUrl}/luma/generate`;

      if (params.firstFrame) {
        requestBody.imageUrl = params.firstFrame;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('[Luma API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || data.message || 'Luma video generation failed');
      }

      return { 
        success: true, 
        taskId: data.data?.taskId,
        estimatedTime: 180,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Luma generation error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Market API (Universal) ============

  async generateWithMarket(params: MarketTaskParams): Promise<GenerationResponse> {
    try {
      console.log('[Market API] Request:', { model: params.model, input: params.input });

      const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          input: params.input,
          callBackUrl: params.callBackUrl,
        }),
      });

      const data = await response.json();
      console.log('[Market API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || data.message || 'Market task creation failed');
      }

      return { 
        success: true, 
        taskId: data.data?.taskId,
        estimatedTime: 120,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Market API error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Image Processing (Market API) ============

  async removeBackground(imageUrl: string): Promise<GenerationResponse> {
    return this.generateWithMarket({
      model: 'recraft/remove-background',
      input: { image: imageUrl },
    });
  }

  async upscaleImage(imageUrl: string): Promise<GenerationResponse> {
    return this.generateWithMarket({
      model: 'recraft/crisp-upscale',
      input: { image: imageUrl },
    });
  }

  async reframeImage(imageUrl: string, aspectRatio: string): Promise<GenerationResponse> {
    return this.generateWithMarket({
      model: 'ideogram/v3-reframe',
      input: {
        image_url: imageUrl,
        image_size: this.mapAspectRatioToIdeogram(aspectRatio),
        rendering_speed: 'BALANCED',
        style: 'AUTO',
        num_images: '1',
      },
    });
  }

  // ============ Nano Banana (Google) Methods ============

  async generateNanoBanana(prompt: string, aspectRatio: string = '1:1'): Promise<GenerationResponse> {
    return this.generateWithMarket({
      model: 'google/nano-banana',
      input: {
        prompt,
        output_format: 'png',
        image_size: aspectRatio,
      },
    });
  }

  async generateNanoBananaPro(prompt: string, imageUrls?: string[], aspectRatio: string = '1:1'): Promise<GenerationResponse> {
    const input: Record<string, unknown> = {
      prompt,
      output_format: 'png',
      aspect_ratio: aspectRatio,
      resolution: '1K',
    };

    if (imageUrls && imageUrls.length > 0) {
      input.image_input = imageUrls;
    }

    return this.generateWithMarket({
      model: 'nano-banana-pro',
      input,
    });
  }

  async editWithNanoBanana(prompt: string, imageUrl: string, aspectRatio: string = '1:1'): Promise<GenerationResponse> {
    return this.generateWithMarket({
      model: 'google/nano-banana-edit',
      input: {
        prompt,
        image_urls: [imageUrl],
        output_format: 'png',
        image_size: aspectRatio,
      },
    });
  }

  // ============ Sora 2 Pro Methods ============

  async generateSoraPro(prompt: string, imageUrl?: string, aspectRatio: string = 'landscape'): Promise<GenerationResponse> {
    const model = imageUrl ? 'sora-2-pro-image-to-video' : 'sora-2-pro-text-to-video';
    
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      n_frames: '10',
      size: 'high',
      remove_watermark: true,
    };

    if (imageUrl) {
      input.image_urls = [imageUrl];
    }

    return this.generateWithMarket({ model, input });
  }

  // ============ Product Photo Generation ============

  async generateProduct(params: GenerateProductParams): Promise<GenerationResponse> {
    return this.generateImage({
      model: 'flux-kontext-pro',
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      sourceImage: params.productImage,
      aspectRatio: params.aspectRatio,
    });
  }

  // ============ Status Check ============

  async checkStatus(taskId: string): Promise<StatusResponse> {
    try {
      // Handle multiple taskIds (comma-separated)
      if (taskId.includes(',')) {
        return this.checkMultipleStatus(taskId.split(','));
      }

      // Determine which endpoint to use based on taskId prefix
      if (taskId.startsWith('task_')) {
        // Market API task
        return this.checkMarketStatus(taskId);
      }
      
      // Try specific API endpoints
      if (taskId.startsWith('fluxkontext_')) {
        return this.checkApiStatus(`${this.baseUrl}/flux/kontext/record-info?taskId=${taskId}`);
      }
      if (taskId.startsWith('task_4o') || taskId.includes('gpt')) {
        return this.checkApiStatus(`${this.baseUrl}/gpt4o-image/record-info?taskId=${taskId}`);
      }
      
      // Default to Veo for hex taskIds
      return this.checkApiStatus(`${this.baseUrl}/veo/record-info?taskId=${taskId}`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Status check error:', message);
      return { status: 'failed', error: message };
    }
  }

  // Check multiple tasks and combine results
  private async checkMultipleStatus(taskIds: string[]): Promise<StatusResponse> {
    const results = await Promise.all(
      taskIds.map(id => this.checkStatus(id.trim()))
    );

    // Combine all results
    const allResults: string[] = [];
    let hasProcessing = false;
    let hasFailed = false;
    let totalProgress = 0;

    for (const result of results) {
      if (result.status === 'processing' || result.status === 'queued') {
        hasProcessing = true;
      }
      if (result.status === 'failed') {
        hasFailed = true;
      }
      if (result.results) {
        allResults.push(...result.results);
      }
      totalProgress += result.progress || 0;
    }

    // Determine overall status
    let status: StatusResponse['status'] = 'completed';
    if (hasProcessing) {
      status = 'processing';
    } else if (hasFailed && allResults.length === 0) {
      status = 'failed';
    }

    return {
      status,
      progress: Math.round(totalProgress / results.length),
      results: allResults.length > 0 ? allResults : undefined,
    };
  }

  private async checkMarketStatus(taskId: string): Promise<StatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      console.log('[Market Status] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        return { status: 'failed', error: data.msg || 'Failed to check status' };
      }

      const record = data.data;
      
      // Map Market API state to our status
      // States: waiting, queuing, generating, success, fail
      let status: StatusResponse['status'] = 'processing';
      
      if (record.state === 'success') {
        status = 'completed';
      } else if (record.state === 'fail') {
        status = 'failed';
      } else if (record.state === 'waiting' || record.state === 'queuing') {
        status = 'queued';
      } else if (record.state === 'generating') {
        status = 'processing';
      }

      // Parse results from resultJson
      const results: string[] = [];
      if (record.resultJson) {
        try {
          const resultData = JSON.parse(record.resultJson);
          if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
            results.push(...resultData.resultUrls);
          }
          if (resultData.resultObject?.url) {
            results.push(resultData.resultObject.url);
          }
        } catch {
          // resultJson might not be valid JSON
        }
      }

      return {
        status,
        results: results.length > 0 ? results : undefined,
        error: record.failMsg || undefined,
        metadata: record,
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Market status check error:', message);
      return { status: 'failed', error: message };
    }
  }

  private async checkApiStatus(endpoint: string): Promise<StatusResponse> {
    try {
      console.log('[Status API] Checking:', endpoint);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json();
      console.log('[Status API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        // Check for content policy violation
        if (data.msg?.includes('violating content policies') || data.msg?.includes('flagged')) {
          return { status: 'failed', error: 'Промпт заблокирован политикой контента. Попробуйте переформулировать запрос без названий брендов.' };
        }
        return this.tryAlternativeStatusEndpoints(endpoint.split('taskId=')[1]);
      }

      // Handle null data
      if (!data.data) {
        return { status: 'processing', progress: 0 };
      }

      return this.parseStatusResponse(data.data);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('API status check error:', message);
      return { status: 'failed', error: message };
    }
  }

  private parseStatusResponse(record: Record<string, unknown> | null): StatusResponse {
    // Handle null record
    if (!record) {
      return { status: 'processing', progress: 0 };
    }

    let status: StatusResponse['status'] = 'processing';
    
    // Check for error message
    if (record.errorMessage) {
      const errorMsg = String(record.errorMessage);
      if (errorMsg.includes('violating content policies') || errorMsg.includes('flagged')) {
        return { status: 'failed', error: 'Промпт заблокирован политикой контента. Попробуйте переформулировать без названий брендов.' };
      }
      return { status: 'failed', error: errorMsg };
    }
    
    // Flux/GPT-4o format: successFlag 0=generating, 1=success, 2=create_failed, 3=generate_failed
    if (record.successFlag !== undefined) {
      const flag = record.successFlag as number;
      if (flag === 1) {
        status = 'completed';
      } else if (flag === 2 || flag === 3) {
        status = 'failed';
      } else if (flag === 0) {
        status = 'processing';
      }
    } 
    // Veo/Runway/Luma format: status field
    else if (record.status) {
      const recordStatus = String(record.status).toLowerCase();
      if (recordStatus === 'completed' || recordStatus === 'success') {
        status = 'completed';
      } else if (recordStatus === 'failed' || recordStatus === 'error') {
        status = 'failed';
      } else if (recordStatus === 'queued' || recordStatus === 'pending') {
        status = 'queued';
      }
    }

    // Extract results
    const results: string[] = [];
    
    if (record.videoUrl) results.push(record.videoUrl as string);
    if (record.video_url) results.push(record.video_url as string);
    
    const response = record.response as Record<string, unknown> | undefined;
    if (response?.resultImageUrl) results.push(response.resultImageUrl as string);
    if (response?.originImageUrl) results.push(response.originImageUrl as string);
    if (response?.result_urls && Array.isArray(response.result_urls)) {
      results.push(...(response.result_urls as string[]));
    }
    
    if (record.imageUrl) results.push(record.imageUrl as string);
    if (record.images && Array.isArray(record.images)) {
      results.push(...(record.images as string[]));
    }

    let progress: number | undefined;
    if (record.progress) {
      progress = typeof record.progress === 'string' 
        ? parseFloat(record.progress) * 100 
        : record.progress as number;
    }

    return {
      status,
      progress,
      results: results.length > 0 ? results : undefined,
      error: (record.errorMessage || record.error) as string | undefined,
      metadata: record,
    };
  }

  private async tryAlternativeStatusEndpoints(taskId: string): Promise<StatusResponse> {
    const endpoints = [
      `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`,
      `${this.baseUrl}/flux/kontext/record-info?taskId=${taskId}`,
      `${this.baseUrl}/gpt4o-image/record-info?taskId=${taskId}`,
      `${this.baseUrl}/veo/record-info?taskId=${taskId}`,
      `${this.baseUrl}/runway/record-info?taskId=${taskId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        });

        const data = await response.json();
        if (data.code === 200) {
          // Check if it's Market API format
          if (data.data?.state) {
            return this.checkMarketStatus(taskId);
          }
          return this.parseStatusResponse(data.data);
        }
      } catch {
        continue;
      }
    }

    return { status: 'failed', error: 'Task not found' };
  }

  // ============ File Upload ============

  async uploadImage(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('[Upload API] Uploading file:', file.name, file.type, file.size);

      const response = await fetch(`${this.baseUrl}/tool/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('[Upload API] Response:', JSON.stringify(data));

      if (data.code !== 200) {
        throw new Error(data.msg || 'Upload failed');
      }

      return { success: true, url: data.data?.url || data.data?.fileUrl };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload error:', message);
      return { success: false, error: message };
    }
  }

  async uploadBase64(base64: string, filename: string = 'image.png'): Promise<UploadResponse> {
    try {
      const response = await fetch(base64);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      return this.uploadImage(file);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Base64 upload error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Account Info ============

  async getCredits(): Promise<{ success: boolean; credits?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/account/credits`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      const data = await response.json();

      if (data.code !== 200) {
        throw new Error(data.msg || 'Failed to get credits');
      }

      return { success: true, credits: data.data?.credits || data.data?.balance };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Get credits error:', message);
      return { success: false, error: message };
    }
  }

  // ============ Utility Methods ============

  private mapAspectRatio(aspectRatio?: string): string {
    const map: Record<string, string> = {
      '1:1': '1:1',
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
      '21:9': '21:9',
      'square': '1:1',
      'landscape': '16:9',
      'portrait': '9:16',
    };
    return map[aspectRatio || '1:1'] || '1:1';
  }

  private mapAspectRatioToIdeogram(aspectRatio?: string): string {
    const map: Record<string, string> = {
      '1:1': 'square_hd',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_16_9',
      '4:3': 'landscape_4_3',
      '3:4': 'portrait_4_3',
    };
    return map[aspectRatio || '1:1'] || 'square_hd';
  }

  async waitForCompletion(
    taskId: string, 
    options: {
      pollInterval?: number;
      maxAttempts?: number;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<StatusResponse> {
    const { 
      pollInterval = 3000, 
      maxAttempts = 120,
      onProgress 
    } = options;

    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.checkStatus(taskId);

      if (onProgress && status.progress) {
        onProgress(status.progress);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    return { status: 'failed', error: 'Generation timed out' };
  }

  async generateImageAndWait(
    params: GenerateImageParams,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; images?: string[]; error?: string }> {
    const genResult = await this.generateImage(params);
    
    if (!genResult.success || !genResult.taskId) {
      return { success: false, error: genResult.error };
    }

    const status = await this.waitForCompletion(genResult.taskId, { onProgress });

    if (status.status === 'completed' && status.results) {
      return { success: true, images: status.results };
    }

    return { success: false, error: status.error || 'Generation failed' };
  }

  async generateVideoAndWait(
    params: GenerateVideoParams,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; videos?: string[]; error?: string }> {
    const genResult = await this.generateVideo(params);
    
    if (!genResult.success || !genResult.taskId) {
      return { success: false, error: genResult.error };
    }

    const status = await this.waitForCompletion(genResult.taskId, { 
      onProgress,
      pollInterval: 5000,
      maxAttempts: 120,
    });

    if (status.status === 'completed' && status.results) {
      return { success: true, videos: status.results };
    }

    return { success: false, error: status.error || 'Generation failed' };
  }
}

// ============ Singleton Export ============

export const kieAPI = new KieAPI();

export function createKieAPI(apiKey?: string): KieAPI {
  return new KieAPI(apiKey || process.env.KIE_API_KEY);
}
