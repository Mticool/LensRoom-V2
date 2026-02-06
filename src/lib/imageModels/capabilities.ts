import { z } from 'zod';
import { PHOTO_MODELS, type PhotoModelConfig, type KieProvider } from '@/config/models';

export type ImageModeKey = 't2i' | 'i2i';
export type ImageInputKey = 'prompt' | 'inputImage' | 'negativePrompt' | 'maskImage';

export type ImageModelId =
  | 'seedream-4.5'
  | 'seedream-4.5-edit'
  | 'z-image'
  | 'gpt-image'
  | 'grok-imagine'
  | 'topaz-image-upscale'
  | 'recraft-remove-background';

export interface ImageOutputCount {
  min: number;
  max: number;
  default: number;
  fixed?: boolean;
}

export interface ImageModelCapability {
  id: string;
  label: string;
  provider: KieProvider;
  apiId: string;
  apiIdI2i?: string;
  modes: ImageModeKey[];

  supportedAspectRatios: string[];
  modeAspectRatios?: Partial<Record<ImageModeKey, string[]>>;

  supportedQualities?: string[];
  supportedResolutions?: string[];

  outputCount?: ImageOutputCount; // number of images returned per request
  requestVariants?: ImageOutputCount; // number of parallel requests allowed (variants)

  supportsNegativePrompt?: boolean;
  supportsReferenceImages?: boolean;
  maxReferenceImages?: number;

  inputImageFormats?: Array<'jpeg' | 'png' | 'webp'>;
  maxInputImageSizeMb?: number;

  requiredInputsByMode: Record<ImageModeKey, { required: ImageInputKey[]; optional?: ImageInputKey[] }>;
  isTool?: boolean;
}

const DEFAULT_VARIANTS: ImageOutputCount = { min: 1, max: 4, default: 1 };

export const IMAGE_MODEL_CAPABILITIES: Record<ImageModelId, ImageModelCapability> = {
  'seedream-4.5': {
    id: 'seedream-4.5',
    label: 'Seedream 4.5',
    provider: 'kie_market',
    apiId: 'seedream/4.5-text-to-image',
    modes: ['t2i'],
    supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9'],
    supportedQualities: ['basic', 'high'],
    outputCount: { min: 1, max: 1, default: 1 },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: true,
    supportsReferenceImages: false,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['prompt', 'inputImage'] },
    },
  },
  'seedream-4.5-edit': {
    id: 'seedream-4.5-edit',
    label: 'Seedream 4.5 Edit',
    provider: 'kie_market',
    apiId: 'seedream/4.5-edit',
    modes: ['i2i'],
    supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9'],
    supportedQualities: ['basic', 'high'],
    outputCount: { min: 1, max: 1, default: 1 },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: true,
    supportsReferenceImages: true,
    maxReferenceImages: 1,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    maxInputImageSizeMb: 10,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['prompt', 'inputImage'] },
    },
  },
  'z-image': {
    id: 'z-image',
    label: 'Z-Image Turbo',
    provider: 'kie_market',
    apiId: 'z-image-turbo',
    modes: ['t2i', 'i2i'],
    supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '4:5', '3:2', '2:3', 'auto'],
    modeAspectRatios: {
      t2i: ['1:1', '4:3', '3:4', '16:9', '9:16', '4:5', '3:2', '2:3'],
      i2i: ['1:1', '4:3', '3:4', '16:9', '9:16', '4:5', '3:2', '2:3', 'auto'],
    },
    outputCount: { min: 1, max: 1, default: 1 },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: true,
    supportsReferenceImages: true,
    maxReferenceImages: 1,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    maxInputImageSizeMb: 10,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['prompt', 'inputImage'] },
    },
  },
  'gpt-image': {
    id: 'gpt-image',
    label: 'GPT Image 1.5',
    provider: 'kie_market',
    apiId: 'gpt-image/1.5-text-to-image',
    apiIdI2i: 'gpt-image/1.5-image-to-image',
    modes: ['t2i', 'i2i'],
    supportedAspectRatios: ['1:1', '3:2', '2:3'],
    supportedQualities: ['medium', 'high'],
    outputCount: { min: 1, max: 1, default: 1 },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: true,
    supportsReferenceImages: true,
    maxReferenceImages: 1,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    maxInputImageSizeMb: 10,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['prompt', 'inputImage'] },
    },
  },
  'grok-imagine': {
    id: 'grok-imagine',
    label: 'Grok Imagine',
    provider: 'kie_market',
    apiId: 'grok-imagine/text-to-image',
    modes: ['t2i'],
    supportedAspectRatios: ['1:1', '3:2', '2:3', '9:16', '16:9'],
    supportedQualities: ['normal', 'fun', 'spicy'],
    outputCount: { min: 6, max: 6, default: 6, fixed: true },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: true,
    supportsReferenceImages: false,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['prompt', 'inputImage'] },
    },
  },
  'topaz-image-upscale': {
    id: 'topaz-image-upscale',
    label: 'Topaz Upscale',
    provider: 'kie_market',
    apiId: 'topaz/image-upscale',
    modes: ['i2i'],
    supportedAspectRatios: [],
    supportedResolutions: ['2k', '4k', '8k'],
    outputCount: { min: 1, max: 1, default: 1, fixed: true },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: false,
    supportsReferenceImages: true,
    maxReferenceImages: 1,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    maxInputImageSizeMb: 10,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['inputImage'] },
    },
    isTool: true,
  },
  'recraft-remove-background': {
    id: 'recraft-remove-background',
    label: 'Recraft Remove Background',
    provider: 'kie_market',
    apiId: 'recraft/remove-background',
    modes: ['i2i'],
    supportedAspectRatios: [],
    outputCount: { min: 1, max: 1, default: 1, fixed: true },
    requestVariants: { min: 1, max: 1, default: 1, fixed: true },
    supportsNegativePrompt: false,
    supportsReferenceImages: true,
    maxReferenceImages: 1,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    maxInputImageSizeMb: 10,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: { required: ['inputImage'] },
    },
    isTool: true,
  },
};

function buildFromConfig(model: PhotoModelConfig): ImageModelCapability {
  const isTool = model.id === 'topaz-image-upscale' || model.id === 'recraft-remove-background';
  const modes: ImageModeKey[] = model.supportsI2i ? ['t2i', 'i2i'] : ['t2i'];
  return {
    id: model.id,
    label: model.name,
    provider: model.provider,
    apiId: model.apiId,
    modes,
    supportedAspectRatios: model.aspectRatios || ['1:1'],
    supportedQualities: model.qualityOptions ? model.qualityOptions.map((q) => String(q)) : undefined,
    outputCount: isTool ? { min: 1, max: 1, default: 1, fixed: true } : DEFAULT_VARIANTS,
    requestVariants: isTool ? { min: 1, max: 1, default: 1, fixed: true } : DEFAULT_VARIANTS,
    supportsNegativePrompt: true,
    supportsReferenceImages: model.supportsI2i,
    maxReferenceImages: model.maxInputImages ?? (model.supportsI2i ? 1 : undefined),
    inputImageFormats: model.inputImageFormats,
    maxInputImageSizeMb: model.maxInputImageSizeMb,
    requiredInputsByMode: {
      t2i: { required: ['prompt'] },
      i2i: model.supportsI2i ? { required: ['prompt', 'inputImage'] } : { required: ['prompt'] },
    },
    isTool,
  };
}

export function getImageModelCapability(modelId: string): ImageModelCapability | null {
  if ((IMAGE_MODEL_CAPABILITIES as Record<string, ImageModelCapability>)[modelId]) {
    return (IMAGE_MODEL_CAPABILITIES as Record<string, ImageModelCapability>)[modelId];
  }

  const model = PHOTO_MODELS.find((m) => m.id === modelId);
  if (!model) return null;
  return buildFromConfig(model);
}

export function getDefaultImageParams(modelId: string): {
  aspectRatio?: string;
  quality?: string;
  resolution?: string;
  outputCount?: number;
  variants?: number;
} {
  const cap = getImageModelCapability(modelId);
  if (!cap) return {};

  const aspectRatio = cap.supportedAspectRatios?.[0];
  const quality = cap.supportedQualities?.[0];
  const resolution = cap.supportedResolutions?.[0];
  const outputCount = cap.outputCount?.default;
  const variants = cap.requestVariants?.default ?? DEFAULT_VARIANTS.default;

  return { aspectRatio, quality, resolution, outputCount, variants };
}

const BaseRequestSchema = z.object({
  modelId: z.string().min(1),
  mode: z.enum(['t2i', 'i2i']),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().optional(),
  quality: z.string().optional(),
  resolution: z.string().optional(),
  variants: z.number().int().min(1).optional(),
  referenceImages: z.array(z.string()).optional(),
  referenceImage: z.string().optional(),
});

export type ImageRequestInput = z.infer<typeof BaseRequestSchema>;

export function validateImageRequest(capability: ImageModelCapability, input: ImageRequestInput) {
  return BaseRequestSchema.superRefine((data, ctx) => {
    if (!capability.modes.includes(data.mode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mode ${data.mode} is not supported for ${capability.id}`,
        path: ['mode'],
      });
    }

    // Required inputs per mode
    const requirements = capability.requiredInputsByMode[data.mode];
    const required = requirements?.required || [];
    for (const key of required) {
      if (key === 'prompt' && !data.prompt?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Prompt is required for this mode',
          path: ['prompt'],
        });
      }
      if (key === 'inputImage') {
        const hasRef =
          (Array.isArray(data.referenceImages) && data.referenceImages.length > 0) ||
          (typeof data.referenceImage === 'string' && data.referenceImage.trim().length > 0);
        if (!hasRef) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Reference image is required for this mode',
            path: ['referenceImage'],
          });
        }
      }
    }

    // Aspect ratio
    const allowedAspectRatios = capability.modeAspectRatios?.[data.mode] || capability.supportedAspectRatios;
    if (data.aspectRatio && allowedAspectRatios?.length) {
      if (!allowedAspectRatios.includes(data.aspectRatio)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported aspect ratio: ${data.aspectRatio}`,
          path: ['aspectRatio'],
        });
      }
    }

    // Quality
    if (data.quality && capability.supportedQualities?.length) {
      if (!capability.supportedQualities.includes(data.quality)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported quality: ${data.quality}`,
          path: ['quality'],
        });
      }
    } else if (data.quality && !capability.supportedQualities?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quality is not supported for this model',
        path: ['quality'],
      });
    }

    // Resolution
    if (data.resolution && capability.supportedResolutions?.length) {
      if (!capability.supportedResolutions.includes(data.resolution)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported resolution: ${data.resolution}`,
          path: ['resolution'],
        });
      }
    } else if (data.resolution && !capability.supportedResolutions?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resolution is not supported for this model',
        path: ['resolution'],
      });
    }

    // Variants (parallel requests)
    const variantsMax = capability.requestVariants?.max ?? DEFAULT_VARIANTS.max;
    if (typeof data.variants === 'number' && data.variants > variantsMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Too many variants: ${data.variants}. Max is ${variantsMax}`,
        path: ['variants'],
      });
    }

    // Reference images count
    if (capability.maxReferenceImages && data.referenceImages?.length) {
      if (data.referenceImages.length > capability.maxReferenceImages) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Too many reference images. Max is ${capability.maxReferenceImages}`,
          path: ['referenceImages'],
        });
      }
    }
  }).safeParse(input);
}

export function getAllowedAspectRatios(capability: ImageModelCapability, mode: ImageModeKey): string[] {
  return capability.modeAspectRatios?.[mode] || capability.supportedAspectRatios || [];
}
