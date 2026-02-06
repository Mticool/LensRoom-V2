import type { GenerateImageRequest } from '@/lib/api/kie-client';
import { getImageModelCapability, type ImageModeKey } from '@/lib/imageModels/capabilities';

export type BuildKieImagePayloadParams = {
  modelId: string;
  mode: ImageModeKey;
  params: {
    prompt?: string;
    negativePrompt?: string;
    aspectRatio?: string;
    quality?: string;
    resolution?: string;
    outputFormat?: 'png' | 'jpg' | 'webp';
    upscaleFactor?: string | number;
  };
  assetUrls?: {
    referenceImages?: string[];
  };
};

export function buildKieImagePayload({ modelId, mode, params, assetUrls }: BuildKieImagePayloadParams): GenerateImageRequest {
  const capability = getImageModelCapability(modelId);
  if (!capability) {
    throw new Error(`Unknown image model: ${modelId}`);
  }

  let apiModelId = capability.apiId;
  if (mode === 'i2i' && capability.apiIdI2i) {
    apiModelId = capability.apiIdI2i;
  }

  const prompt = String(params.prompt || '').trim();
  const negative = String(params.negativePrompt || '').trim();

  const payload: GenerateImageRequest = {
    model: apiModelId,
    prompt,
  };

  if (negative && capability.supportsNegativePrompt !== false) {
    payload.negativePrompt = negative;
  }

  // Aspect ratio
  if (params.aspectRatio && capability.supportedAspectRatios?.length) {
    payload.aspectRatio = params.aspectRatio;
  }

  // Quality
  if (params.quality && capability.supportedQualities?.length) {
    payload.quality = params.quality as any;
  }

  // Resolution
  if (params.resolution && capability.supportedResolutions?.length) {
    payload.resolution = params.resolution as any;
  }

  // Output format
  if (params.outputFormat) {
    payload.outputFormat = params.outputFormat === 'webp' ? 'png' : params.outputFormat;
  }

  // Reference images
  if (capability.supportsReferenceImages && assetUrls?.referenceImages && assetUrls.referenceImages.length > 0) {
    payload.imageInputs = assetUrls.referenceImages;
  }

  // Tool-specific
  if (typeof params.upscaleFactor !== 'undefined') {
    payload.upscaleFactor = params.upscaleFactor as any;
  }

  return payload;
}
