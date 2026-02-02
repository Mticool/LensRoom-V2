// ===== OPENAI API CLIENT =====
// Documentation: https://platform.openai.com/docs/guides/image-generation
//
// Endpoints:
// - Image generation: POST /v1/images/generations
// - Image edit: POST /v1/images/edit
//
// Model: gpt-image-1 (alias: gpt-image-1.5-2025-12-16)
// Sizes: 1024x1024, 1024x1536, 1536x1024
// Quality: medium, high

import { env } from "@/lib/env";
import { fetchWithTimeout } from './fetch-with-timeout';

// Model snapshots
export const OPENAI_IMAGE_MODEL = "gpt-image-1";
export const OPENAI_IMAGE_SNAPSHOT = "gpt-image-1.5-2025-12-16";

// ===== REQUEST TYPES =====

export interface OpenAIImageGenerationRequest {
  model: string; // "gpt-image-1" or snapshot
  prompt: string;
  quality?: "medium" | "high"; // Required for generation
  size?: "1024x1024" | "1024x1536" | "1536x1024"; // Required for generation
  n?: number; // Number of images (default 1, max 1 for gpt-image-1)
  output_format?: "png" | "jpeg" | "webp";
  // Note: gpt-image-1 uses output_format (png/jpeg/webp), not response_format (url/b64_json)
}

export interface OpenAIImageEditRequest {
  model: string;
  image: string; // Base64 encoded image
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  n?: number;
  response_format?: "url" | "b64_json";
}

// ===== RESPONSE TYPES =====

export interface OpenAIImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string | null;
    code?: string | null;
  };
}

// ===== API CLIENT =====

export class OpenAIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // Only require API key when actually instantiating (not at module import time)
    const key = env.optional("OPENAI_API_KEY");
    if (!key) {
      throw new Error("OPENAI_API_KEY is not configured. Please add it to .env.local");
    }
    this.apiKey = key;
    this.baseUrl = "https://api.openai.com/v1";
  }

  /**
   * Generate images using GPT Image
   * POST /v1/images/generations
   * Note: gpt-image-1 supports output_format (png/jpeg/webp), not response_format (url/b64_json)
   */
  async generateImage(
    request: OpenAIImageGenerationRequest
  ): Promise<OpenAIImageGenerationResponse> {
    const body: any = {
      model: request.model || OPENAI_IMAGE_MODEL,
      prompt: request.prompt,
      n: request.n || 1,
      output_format: request.output_format || "png",
    };
    
    // Quality and size are required for gpt-image-1
    if (request.quality) {
      body.quality = request.quality;
    }
    if (request.size) {
      body.size = request.size;
    }
    
    console.log('[OpenAI] Request body:', JSON.stringify(body));

    const response = await fetchWithTimeout(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      timeout: 120000, // 2 minutes for image generation
    });

    const responseText = await response.text();
    console.log('[OpenAI] Response status:', response.status);
    console.log('[OpenAI] Response text preview:', responseText.substring(0, 500));
    
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error: OpenAIError = JSON.parse(responseText);
        errorMessage = error.error.message || response.statusText;
      } catch {
        errorMessage = responseText || response.statusText;
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    try {
      const result = JSON.parse(responseText);
      console.log('[OpenAI] Parsed response:', {
        created: result.created,
        dataLength: result.data?.length,
        hasB64: !!result.data?.[0]?.b64_json,
        hasUrl: !!result.data?.[0]?.url,
      });
      return result;
    } catch (parseErr) {
      console.error('[OpenAI] Failed to parse response:', parseErr);
      throw new Error(`OpenAI API returned invalid JSON: ${responseText.substring(0, 200)}`);
    }
  }

  /**
   * Edit images using GPT Image
   * POST /v1/images/edit
   * Requires base64 encoded image
   */
  async editImage(
    request: OpenAIImageEditRequest
  ): Promise<OpenAIImageGenerationResponse> {
    const formData = new FormData();
    
    // Convert base64 to blob
    const base64Match = request.image.match(/^data:(.+);base64,(.+)$/);
    if (base64Match) {
      const mime = base64Match[1];
      const b64 = base64Match[2];
      const buffer = Buffer.from(b64, 'base64');
      const blob = new Blob([buffer], { type: mime });
      formData.append('image', blob, 'image.png');
    } else {
      throw new Error('Image must be base64 encoded');
    }
    
    formData.append('model', request.model || OPENAI_IMAGE_MODEL);
    formData.append('prompt', request.prompt);
    if (request.size) formData.append('size', request.size);
    if (request.n) formData.append('n', String(request.n));

    const response = await fetchWithTimeout(`${this.baseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
      timeout: 120000, // 2 minutes for image editing
    });

    if (!response.ok) {
      const error: OpenAIError = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error.message || response.statusText}`
      );
    }

    return await response.json();
  }
}

// Singleton instance
let clientInstance: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!clientInstance) {
    clientInstance = new OpenAIClient();
  }
  return clientInstance;
}

// ===== PRICING MAPPINGS =====

// Official OpenAI pricing per image (USD)
export const OPENAI_PRICING_USD: Record<string, number> = {
  // Medium quality
  "medium_1024x1024": 0.034,
  "medium_1024x1536": 0.05,
  "medium_1536x1024": 0.05,
  // High quality
  "high_1024x1024": 0.133,
  "high_1024x1536": 0.2,
  "high_1536x1024": 0.2,
};

// Get pricing key from quality and size
export function getOpenAIPricingKey(
  quality: string,
  size: string
): string {
  return `${quality}_${size}`;
}

// Get USD cost for a generation
export function getOpenAIProviderCost(
  quality: string,
  size: string
): number {
  const key = getOpenAIPricingKey(quality, size);
  return OPENAI_PRICING_USD[key] || 0;
}

// Map aspect ratio to OpenAI size
export function aspectRatioToOpenAISize(aspectRatio: string): '1024x1024' | '1024x1536' | '1536x1024' {
  switch (aspectRatio) {
    case '9:16':
    case '2:3':
      return '1024x1536'; // Portrait
    case '16:9':
    case '3:2':
      return '1536x1024'; // Landscape
    case '1:1':
    default:
      return '1024x1024'; // Square
  }
}

// Extract quality from model ID
export function parseOpenAIModelId(modelId: string): {
  quality: 'medium' | 'high';
  size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
} {
  // Default values
  let quality: 'medium' | 'high' = 'medium';
  let size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto' = 'auto';
  
  // New simplified format: gpt-image-medium, gpt-image-high
  if (modelId.includes('-high')) {
    quality = 'high';
  } else if (modelId.includes('-medium')) {
    quality = 'medium';
  }
  
  // Old format with explicit size
  if (modelId.includes('-portrait')) {
    size = '1024x1536';
  } else if (modelId.includes('-landscape')) {
    size = '1536x1024';
  } else if (modelId.includes('-square')) {
    size = '1024x1024';
  }
  
  return { quality, size };
}

