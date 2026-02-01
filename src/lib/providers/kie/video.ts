import { VideoGenerationRequest } from '@/lib/videoModels/schema';
import { getModelCapability } from '@/lib/videoModels/capabilities';
import { getKieClient } from '@/lib/api/kie-client';
import type { GenerateVideoRequest, GenerateVideoResponse } from '@/lib/api/kie-client';

/**
 * Provider mapping layer for Kie.ai video generation
 * Translates unified VideoGenerationRequest to Kie-specific API format
 */

export function mapRequestToKiePayload(
  request: VideoGenerationRequest
): GenerateVideoRequest {
  const capability = getModelCapability(request.modelId);
  if (!capability) {
    throw new Error(`Unknown model: ${request.modelId}`);
  }

  // Determine provider
  const provider = capability.provider === 'kie' ? 'kie_market' : 
                   capability.provider === 'laozhang' ? 'laozhang' : 
                   'kie_market';

  // Base payload
  const payload: GenerateVideoRequest = {
    model: capability.apiId,
    provider: provider as any,
    prompt: request.prompt,
    mode: request.mode as any,
    duration: request.durationSec,
    aspectRatio: request.aspectRatio,
  };

  // Mode-specific API IDs
  if (request.mode === 'i2v' && capability.apiIdI2v) {
    payload.model = capability.apiIdI2v;
  } else if (request.mode === 'v2v' && capability.apiIdV2v) {
    payload.model = capability.apiIdV2v;
  } else if (request.mode === 'start_end' && capability.apiIdI2v) {
    payload.model = capability.apiIdI2v;
  }

  // Image inputs
  if (request.inputImage) {
    payload.imageUrl = request.inputImage;
  }
  
  if (request.referenceImages && request.referenceImages.length > 0) {
    payload.imageUrls = request.referenceImages;
  }

  // Video inputs
  if (request.referenceVideo) {
    payload.videoUrl = request.referenceVideo;
  }

  // Start/End frames
  if (request.startImage) {
    payload.imageUrl = request.startImage;
  }
  if (request.endImage) {
    payload.lastFrameUrl = request.endImage;
  }

  // Quality/Resolution - only send if model supports it
  if (request.quality && capability.supportedQualities?.includes(request.quality)) {
    // Map quality to appropriate field based on model
    if (['720p', '1080p', '4k'].includes(request.quality)) {
      payload.resolution = request.quality;
    } else {
      payload.quality = request.quality;
    }
  }

  // Audio
  if (capability.supportsSound && request.sound !== undefined) {
    payload.sound = request.sound;
  }
  if (request.soundPreset) {
    payload.sound = request.soundPreset;
  }

  // Model-specific parameters
  
  // Grok Video: style
  if (request.modelId === 'grok-video' && request.style) {
    (payload as any).style = request.style;
  }

  // WAN 2.6: camera motion, style preset, motion strength
  if (request.modelId === 'wan-2.6') {
    if (request.cameraMotion) {
      (payload as any).cameraMotion = request.cameraMotion;
    }
    if (request.stylePreset) {
      (payload as any).stylePreset = request.stylePreset;
    }
    if (request.motionStrength !== undefined) {
      (payload as any).motionStrength = request.motionStrength;
    }
  }

  // Kling: quality tier
  if (request.modelId.startsWith('kling') && request.qualityTier) {
    (payload as any).qualityTier = request.qualityTier;
  }

  // Motion Control: character orientation
  if (request.modelId === 'kling-motion-control') {
    (payload as any).characterOrientation = 'video'; // Default to video orientation
  }

  return payload;
}

export async function callKieGenerateVideo(
  request: VideoGenerationRequest
): Promise<GenerateVideoResponse> {
  const kieClient = getKieClient();
  const payload = mapRequestToKiePayload(request);
  
  try {
    const response = await kieClient.generateVideo(payload);
    return response;
  } catch (error) {
    console.error('[Kie Provider] Video generation failed:', error);
    throw error;
  }
}

/**
 * Helper: Validate that a request can be fulfilled by Kie provider
 */
export function validateKieRequest(request: VideoGenerationRequest): {
  valid: boolean;
  errors: string[];
} {
  const capability = getModelCapability(request.modelId);
  const errors: string[] = [];

  if (!capability) {
    errors.push(`Unknown model: ${request.modelId}`);
    return { valid: false, errors };
  }

  // Check if provider is Kie or LaoZhang
  if (!['kie', 'laozhang'].includes(capability.provider)) {
    errors.push(`Model ${request.modelId} uses provider ${capability.provider}, not Kie`);
  }

  // Veo-specific validations
  if (request.modelId === 'veo-3.1-fast') {
    // Veo doesn't support 1:1 aspect ratio
    if (request.aspectRatio === '1:1') {
      errors.push('Veo 3.1 does not support 1:1 aspect ratio');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
