import { VideoGenerationRequest } from '@/lib/videoModels/schema';
import { getModelCapability } from '@/lib/videoModels/capabilities';
import { getKieClient, pickKieKeySlot } from '@/lib/api/kie-client';
import type { GenerateVideoRequest, GenerateVideoResponse } from '@/lib/api/kie-client';

/**
 * Provider mapping layer for Kie.ai video generation
 * Translates unified VideoGenerationRequest to Kie-specific API format
 */

export type KieVideoBuildParams = {
  modelId: string;
  mode: 't2v' | 'i2v' | 'v2v' | 'v2v_edit' | 'start_end' | 'motion_control' | 'extend' | 'ref2v';
  prompt: string;
  durationSec: number;
  aspectRatio?: string;
  quality?: string;
  resolution?: string;
  sound?: boolean;
  inputImageUrl?: string;
  endImageUrl?: string;
  referenceImages?: string[];
  referenceVideoUrl?: string;
  characterOrientation?: 'image' | 'video';
  cfgScale?: number;
  cameraControl?: Record<string, unknown> | string;
  qualityTier?: 'standard' | 'pro' | 'master';
  style?: string;
  shots?: Array<{ prompt: string; duration?: number }>;
};

export function buildKieVideoPayload(params: KieVideoBuildParams): GenerateVideoRequest {
  const capability = getModelCapability(params.modelId);
  if (!capability) {
    throw new Error(`Unknown model: ${params.modelId}`);
  }

  const provider =
    capability.provider === 'kie' ? 'kie_market' :
    capability.provider === 'laozhang' ? 'laozhang' :
    'kie_market';

  // Resolve API model ID by mode
  let apiModelId = capability.apiId;
  if (params.mode === 'i2v' && capability.apiIdI2v) apiModelId = capability.apiIdI2v;
  if (params.mode === 'v2v' && capability.apiIdV2v) apiModelId = capability.apiIdV2v;
  if (params.mode === 'start_end' && capability.apiIdI2v) apiModelId = capability.apiIdI2v;

  // Kling 2.1: map quality tier to specific API model IDs
  if (params.modelId === 'kling-2.1') {
    const tier = (params.qualityTier || 'standard').toLowerCase();
    if (tier === 'standard' || tier === 'pro' || tier === 'master') {
      apiModelId =
        params.mode === 'i2v'
          ? `kling/v2-1-${tier}-image-to-video`
          : `kling/v2-1-${tier}-text-to-video`;
    }
  }

  const payload: GenerateVideoRequest = {
    model: apiModelId,
    provider: provider as any,
    prompt: params.prompt,
    mode: params.mode,
    duration: params.durationSec,
    aspectRatio: params.aspectRatio,
  };

  // Images
  if (params.inputImageUrl) payload.imageUrl = params.inputImageUrl;
  if (params.endImageUrl) payload.lastFrameUrl = params.endImageUrl;
  if (params.referenceImages && params.referenceImages.length > 0) {
    payload.referenceImages = params.referenceImages;
  }

  // Video
  if (params.referenceVideoUrl) payload.videoUrl = params.referenceVideoUrl;

  // Quality/Resolution
  if (params.resolution) payload.resolution = params.resolution;
  if (params.quality) payload.quality = params.quality;

  // Audio
  if (capability.audioSupport === 'toggle' && typeof params.sound === 'boolean') {
    payload.sound = params.sound;
  }

  // Model-specific fields
  if (params.modelId === 'grok-video' && params.style) {
    payload.style = params.style;
  }

  if (params.modelId === 'kling-motion-control') {
    payload.mode = 'motion_control';
    if (params.characterOrientation) payload.characterOrientation = params.characterOrientation;
  }

  // Kling O3 Edit: pass video and optional image
  if (params.modelId === 'kling-o1-edit') {
    payload.mode = 'v2v_edit' as any;
    if (params.referenceVideoUrl) payload.videoUrl = params.referenceVideoUrl;
    // Duration comes from durationSec
  }

  if (typeof params.cfgScale === 'number') payload.cfgScale = params.cfgScale;
  if (params.shots) payload.shots = params.shots;

  return payload;
}

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
    if ((request as any).characterOrientation) {
      (payload as any).characterOrientation = (request as any).characterOrientation;
    }
  }
  if (typeof (request as any).cfgScale === 'number') {
    (payload as any).cfgScale = (request as any).cfgScale;
  }

  return payload;
}

export async function callKieGenerateVideo(
  request: VideoGenerationRequest
): Promise<GenerateVideoResponse> {
  const pool = String(process.env.KIE_API_KEY_VIDEO_POOL || "").trim();
  const poolSize = pool ? pool.split(/[\s,]+/).filter(Boolean).length : 0;
  const slot = pickKieKeySlot("video", poolSize);
  const kieClient = getKieClient({ scope: "video", slot });
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
