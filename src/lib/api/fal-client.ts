/**
 * Fal.ai Client for Kling O1
 * 
 * APIs:
 * - Video-to-Video: fal-ai/kling-video/o1/video-to-video/edit
 * - Image-to-Video (Standard): fal-ai/kling-video/o1/standard/image-to-video
 * 
 * Docs: https://fal.ai/models/fal-ai/kling-video/o1/standard/image-to-video/api
 */

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
  image_url: string; // Required: начальное изображение
  duration?: '5' | '10'; // 5 сек ($0.56) или 10 сек ($1.12)
  aspect_ratio?: '16:9' | '9:16' | '1:1'; // Default: 16:9
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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
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
   * Query Kling O1 I2V job status
   * Note: FAL uses a shared endpoint for all kling-video requests
   */
  async queryKlingO1I2VStatus(requestId: string): Promise<FalJobStatus> {
    // FAL uses shared endpoint without the /o1/image-to-video part
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/requests/${requestId}/status`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new FalAPIError(`Failed to query I2V job status: ${response.status}`, response.status, errorText);
      }

      const data = await response.json();
      return data as FalJobStatus;
    } catch (error) {
      if (error instanceof FalAPIError) throw error;
      throw new FalAPIError(
        `Failed to query I2V job status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Submit a video edit job to fal.ai queue (V2V)
   */
  async submitKlingO1Job(params: FalKlingO1Request): Promise<{ request_id: string; status_url: string }> {
    const endpoint = `${this.baseUrl}/fal-ai/kling-video/o1/video-to-video/edit`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
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
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
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
      const response = await fetch(videoUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
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