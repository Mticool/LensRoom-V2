/**
 * Fal.ai Client for Kling Video + ElevenLabs
 *
 * APIs:
 * - Video: fal-ai/kling-video/o1/..., fal-ai/kling-video/o3/...
 * - Audio: fal-ai/elevenlabs/tts/eleven-v3, fal-ai/elevenlabs/voice-cloning
 */

import { fetchWithTimeout } from './fetch-with-timeout';

// ===== ELEVENLABS TYPES =====

export interface FalElevenLabsVoiceCloneRequest {
  audio_urls: string[];
  remove_background_noise?: boolean;
}

export interface FalElevenLabsVoiceCloneResponse {
  voice_id: string;
  voice_name?: string;
}

export interface FalElevenLabsTTSRequest {
  text: string;
  voice: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  language_code?: string;
}

export interface FalElevenLabsTTSResponse {
  audio: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
  duration_seconds?: number;
}

// ===== VIDEO-TO-VIDEO TYPES =====

export interface FalKlingO1Element {
  frontal_image_url: string;
  reference_image_urls?: string[];
}

export interface FalKlingO1Request {
  prompt: string;
  video_url: string;
  image_urls?: string[];
  elements?: FalKlingO1Element[];
  keep_audio?: boolean;
}

// ===== IMAGE-TO-VIDEO (Standard Mode) TYPES =====
// Документация: https://fal.ai/models/fal-ai/kling-video/o1/standard/image-to-video

export interface FalKlingO1I2VRequest {
  prompt: string;
  // NOTE: O1 supports start/end frames (first/last frame).
  // Some older endpoints use `image_url` for start-only; we keep it optional for compatibility.
  start_image_url: string; // Required: стартовое изображение
  end_image_url?: string; // Optional: конечное изображение
  image_url?: string; // legacy alias for start_image_url
  duration?: '5' | '10'; // 5 сек ($0.56) или 10 сек ($1.12)
  aspect_ratio?: '16:9' | '9:16' | '1:1'; // Default: 16:9
}

export interface FalKlingO1V2VReferenceRequest {
  prompt: string;
  video_url: string;
  image_url?: string;
  duration?: '5' | '10';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
}

// ===== IMAGE-TO-VIDEO (O3 Standard) TYPES =====
// Документация: https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video
export interface FalKlingO3MultiPromptElement {
  prompt: string;
  duration: number;
}

export interface FalKlingO3I2VRequest {
  prompt: string;
  image_url: string;
  end_image_url?: string;
  duration?: '3' | '5' | '8' | '10' | '12' | '15';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  generate_audio?: boolean;
  negative_prompt?: string;
  multi_prompt?: FalKlingO3MultiPromptElement[];
  shot_type?: 'single' | 'customize';
}

export interface FalKlingO3T2VRequest {
  prompt: string;
  duration?: '3' | '5' | '8' | '10' | '12' | '15';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  generate_audio?: boolean;
  negative_prompt?: string;
  multi_prompt?: FalKlingO3MultiPromptElement[];
  shot_type?: 'single' | 'customize';
}

export interface FalKlingO3V2VRequest {
  prompt: string;
  video_url: string;
  image_url?: string;
  duration?: '3' | '5' | '8' | '10' | '12' | '15';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  generate_audio?: boolean;
  negative_prompt?: string;
  multi_prompt?: FalKlingO3MultiPromptElement[];
  shot_type?: 'single' | 'customize';
}

export interface FalKlingO3EditRequest {
  prompt: string;
  video_url: string;
  image_urls?: string[];
  elements?: FalKlingO1Element[];
  keep_audio?: boolean;
  duration?: '3' | '5' | '8' | '10' | '12' | '15';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
}

export interface FalKlingO1Response {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  };
  timings: {
    inference: number;
  };
}

export interface FalJobStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  request_id: string;
  logs?: Array<{ message: string; level: string; timestamp: string }>;
  metrics?: {
    inference_time?: number;
  };
  // On completion
  video?: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  };
  // On error
  error?: string;
}

export class FalAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'FalAPIError';
  }
}

export class FalAIClient {
  private apiKey: string;
  private baseUrl = 'https://queue.fal.run';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('FAL_KEY is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Submit Kling O1 Image-to-Video (Standard Mode) job
   * Docs: https://fal.ai/models/fal-ai/kling-video/o1/standard/image-to-video
   * Себестоимость fal.ai: $0.112/сек
   * Цены: 5s = 120⭐, 10s = 240⭐ (правило: 10s = 2× от 5s)
   */
  async submitKlingO1ImageToVideo(params: FalKlingO1I2VRequest): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o1/standard/image-to-video`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000, // 60s for job submission
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O1 I2V job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O1 I2V job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Submit Kling O1 Video-to-Video Reference (Standard Mode) job
   */
  async submitKlingO1VideoToVideoReference(
    params: FalKlingO1V2VReferenceRequest
  ): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o1/standard/video-to-video/reference`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O1 V2V reference job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O1 V2V reference job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query Kling O1 I2V job status
   * Note: FAL uses a shared endpoint for all kling-video requests
   */
  async queryKlingO1I2VStatus(requestId: string): Promise<FalJobStatus> {
    return this.queryKlingVideoStatus(requestId);
  }

  /**
   * Submit Kling O3 Standard Image-to-Video job
   * Docs: https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video
   */
  async submitKlingO3StandardImageToVideo(
    params: FalKlingO3I2VRequest
  ): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o3/standard/image-to-video`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O3 Standard I2V job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O3 Standard I2V job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Submit Kling O3 Standard Text-to-Video job
   * Docs: https://fal.ai/models/fal-ai/kling-video/o3/standard/text-to-video
   */
  async submitKlingO3StandardTextToVideo(
    params: FalKlingO3T2VRequest
  ): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o3/standard/text-to-video`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O3 Standard T2V job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O3 Standard T2V job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Submit Kling O3 Standard Video-to-Video (Reference) job
   * Docs: https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/reference
   */
  async submitKlingO3StandardVideoToVideoReference(
    params: FalKlingO3V2VRequest
  ): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o3/standard/video-to-video/reference`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O3 Standard V2V job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O3 Standard V2V job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Submit a video edit job to fal.ai O3 Standard queue (V2V Edit)
   */
  async submitKlingO3StandardVideoToVideoEdit(
    params: FalKlingO3EditRequest
  ): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o3/standard/video-to-video/edit`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Kling O3 Standard V2V Edit job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O3 Standard V2V Edit job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query kling-video job status (shared for O1/O3)
   */
  async queryKlingVideoStatus(requestId: string): Promise<FalJobStatus> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/requests/${requestId}/status`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 10000, // 10s for status check
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new FalAPIError(`Failed to query Kling video job status: ${response.status}`, response.status, errorText);
      }

      const data = await response.json();
      return data as FalJobStatus;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(`Failed to query Kling video job status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Submit a video edit job to fal.ai queue (V2V)
   */
  async submitKlingO1Job(params: FalKlingO1Request): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o1/video-to-video/edit`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 60000, // 60s for job submission
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new FalAPIError(
          errorData.message || errorData.detail || `Fal.ai API error: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      
      // Fal.ai queue returns: { request_id, status_url }
      if (!data.request_id) {
        throw new FalAPIError('Invalid response: missing request_id', response.status, data);
      }

      console.log('[Fal.ai] Job submitted:', data.request_id);
      return data;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to submit Kling O1 job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query job status
   * Note: FAL uses a shared endpoint for all kling-video requests
   */
  async queryJobStatus(requestId: string): Promise<FalJobStatus> {
    // FAL uses shared endpoint without the model-specific path
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/requests/${requestId}/status`;

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 10000, // 10s for status check
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new FalAPIError(`Failed to query job status: ${response.status}`, response.status, errorText);
      }

      const data = await response.json();
      return data as FalJobStatus;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to query job status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get final result (polls until completed)
   */
  async getJobResult(requestId: string, maxAttempts = 120, intervalMs = 5000): Promise<FalKlingO1Response> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.queryJobStatus(requestId);

      if (status.status === 'COMPLETED') {
        if (!status.video?.url) {
          throw new FalAPIError('Job completed but no video URL returned', undefined, status);
        }
        return {
          video: status.video,
          timings: {
            inference: status.metrics?.inference_time || 0,
          },
        };
      }

      if (status.status === 'FAILED') {
        throw new FalAPIError(
          status.error || 'Job failed without error message',
          undefined,
          status
        );
      }

      // Still processing
      console.log(`[Fal.ai] Job ${requestId} status: ${status.status} (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new FalAPIError(`Job timed out after ${maxAttempts} attempts`, undefined, { requestId });
  }

  /**
   * Clone voice via Qwen 3 TTS (fal.ai)
   */
  async cloneVoice(audioUrl: string, referenceText?: string): Promise<{ voice_embedding_url: string }> {
    const { fal } = await import('@fal-ai/client');
    
    fal.config({
      credentials: this.apiKey,
    });

    console.log('[Fal.ai] Cloning voice with audio_url:', audioUrl);

    try {
      const result = await fal.subscribe('fal-ai/qwen-3-tts/clone-voice/1.7b', {
        input: {
          audio_url: audioUrl,
          // reference_text is optional
          ...(referenceText ? { reference_text: referenceText } : {}),
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log('[Fal.ai] Queue update:', update.status);
        },
      });

      console.log('[Fal.ai] Qwen3 Voice cloned result:', JSON.stringify(result.data));
      
      const data = result.data as any;
      const embeddingUrl = data?.speaker_embedding?.url || data?.speaker_embedding_file_url || data?.voice_embedding_url;
      if (!embeddingUrl) {
        throw new FalAPIError('Missing speaker embedding url in response', undefined, data);
      }
      return { voice_embedding_url: embeddingUrl };
    } catch (error: any) {
      console.error('[Fal.ai] Clone voice error:', error?.message, error?.body);
      throw error;
    }
  }

  /**
   * Generate TTS via Qwen 3 or ElevenLabs
   */
  async generateTTS(params: {
    text: string;
    voice_id?: string;
    language?: string;
    speed?: number;
    pitch?: number;
    useElevenLabs?: boolean;
  }): Promise<{ audio: { url: string }; duration_seconds?: number }> {
    const { fal } = await import('@fal-ai/client');
    
    fal.config({
      credentials: this.apiKey,
    });

    if (params.useElevenLabs) {
      // Use ElevenLabs TTS Turbo v2.5 (preset voices only)
      const result = await fal.subscribe('fal-ai/elevenlabs/tts/turbo-v2.5', {
        input: {
          text: params.text,
          voice: params.voice_id || 'Liam',
          language_code: params.language || 'ru',
          ...(params.speed ? { speed: params.speed } : {}),
        },
      });
      return result.data as any;
    } else {
      // Use Qwen 3 TTS (supports cloned voices via speaker_voice_embedding_file_url)
      // Use queue for async processing
      const { request_id } = await fal.queue.submit('fal-ai/qwen-3-tts/text-to-speech/1.7b', {
        input: {
          text: params.text,
          speaker_voice_embedding_file_url: params.voice_id, // .safetensors URL from cloning
          language: params.language === 'ru' ? 'Russian' : params.language === 'en' ? 'English' : 'Auto',
          top_k: 50,
          top_p: 1,
          temperature: 0.9,
          repetition_penalty: 1.05,
          ...(params.speed ? { speed: params.speed } : {}),
          ...(typeof params.pitch === 'number' ? { pitch: params.pitch } : {}),
          subtalker_dosample: true,
          subtalker_top_k: 50,
          subtalker_top_p: 1,
          subtalker_temperature: 0.9,
          max_new_tokens: 200,
        },
      });
      
      // Poll until completed
      let attempts = 0;
      const maxAttempts = 120;
      while (attempts < maxAttempts) {
        const status = await fal.queue.status('fal-ai/qwen-3-tts/text-to-speech/1.7b', { requestId: request_id });
        
        // Type assertion for status - queue.status returns different types
        const statusData = status as any;
        
        if (statusData.status === 'COMPLETED' || statusData.status === 'SUCCESS') {
          const result = await fal.queue.result('fal-ai/qwen-3-tts/text-to-speech/1.7b', { requestId: request_id });
          const data = result.data as any;
          return {
            audio: { url: data?.audio?.url },
            duration_seconds: data?.audio?.duration,
          };
        }
        
        if (statusData.status === 'FAILED') {
          throw new Error(statusData.error || 'TTS generation failed');
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
      
      throw new Error('TTS generation timeout');
    }
  }

  /**
   * Query ElevenLabs job status
   * Uses result endpoint, not status (Fal.ai difference)
   */
  async queryElevenLabsStatus(requestId: string, jobType: 'voice-cloning' | 'tts'): Promise<FalJobStatus> {
    const path = jobType === 'voice-cloning' 
      ? 'fal-ai/elevenlabs/voice-cloning'
      : 'fal-ai/elevenlabs/tts/eleven-v3';
    
    // Try result endpoint first (fal.ai queue pattern)
    const endpoint = `${this.baseUrl}/${path}/requests/${requestId}`;
    
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 10000, // 10s for status check
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Fal.ai] Status check failed (${response.status}):`, errorText);
        throw new FalAPIError(`Failed to query job: ${response.status}`, response.status);
      }

      const data = await response.json();
      
      // Map fal.ai response to our format
      return {
        status: data.status || 'IN_PROGRESS',
        request_id: requestId,
        ...data,
      } as FalJobStatus;
    } catch (error) {
      console.error('[Fal.ai] queryElevenLabsStatus error:', error);
      throw error;
    }
  }

  /**
   * Validate video metadata (duration, size, format)
   */
  async validateVideoMetadata(videoUrl: string): Promise<{
    valid: boolean;
    duration?: number;
    size?: number;
    format?: string;
    error?: string;
  }> {
    try {
      // HEAD request to check content-type and size
      const response = await fetchWithTimeout(videoUrl, {
        method: 'HEAD',
        timeout: 10000, // 10s for metadata check
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : undefined;

      // Check if it's a video
      if (!contentType.includes('video/')) {
        return {
          valid: false,
          error: `Invalid content type: ${contentType} (expected video/*)`,
        };
      }

      // Check size (≤200MB)
      if (size && size > 200 * 1024 * 1024) {
        return {
          valid: false,
          error: `Video size ${(size / 1024 / 1024).toFixed(1)}MB exceeds 200MB limit`,
          size,
        };
      }

      // Extract format from content-type
      const format = contentType.split('/')[1]?.split(';')[0];

      // Validate format (mp4, mov, webm, m4v, gif)
      const validFormats = ['mp4', 'mov', 'webm', 'm4v', 'gif', 'quicktime', 'x-m4v'];
      if (format && !validFormats.some(f => format.includes(f))) {
        return {
          valid: false,
          error: `Unsupported format: ${format}. Supported: mp4, mov, webm, m4v, gif`,
          format,
        };
      }

      return {
        valid: true,
        size,
        format,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

/**
 * Get singleton Fal.ai client instance
 */
let falClientInstance: FalAIClient | null = null;

export function getFalClient(): FalAIClient {
  if (!falClientInstance) {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error('FAL_KEY environment variable is not set');
    }
    falClientInstance = new FalAIClient(apiKey);
  }
  return falClientInstance;
}
