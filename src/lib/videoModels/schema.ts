import { z } from 'zod';

// ===== ENUMS =====

export const ModelIdEnum = z.enum([
  'veo-3.1-fast',
  'kling-2.6',
  'kling-2.5',
  'kling-2.1',
  'grok-video',
  'sora-2',
  'wan-2.6',
  'kling-motion-control',
]);
export type ModelId = z.infer<typeof ModelIdEnum>;

export const ModeEnum = z.enum(['t2v', 'i2v', 'ref2v', 'v2v', 'motion_control']);
export type Mode = z.infer<typeof ModeEnum>;

export const AspectRatioEnum = z.enum([
  'auto',
  '16:9',
  '9:16',
  '1:1',
  'portrait',
  'landscape',
  '3:2',
  '2:3',
]);
export type AspectRatio = z.infer<typeof AspectRatioEnum>;

export const QualityEnum = z.enum([
  '720p',
  '1080p',
  '4k',
  'standard',
  'pro',
  'master',
]);
export type Quality = z.infer<typeof QualityEnum>;

export const ProviderEnum = z.enum(['kie', 'laozhang', 'openai', 'fal', 'genaipro']);
export type Provider = z.infer<typeof ProviderEnum>;

// Grok Video styles
export const GrokStyleEnum = z.enum([
  'realistic', 'fantasy', 'sci-fi', 'cinematic', 'anime', 'cartoon'
]);
export type GrokStyle = z.infer<typeof GrokStyleEnum>;

// WAN camera motion options
export const CameraMotionEnum = z.enum([
  'static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 
  'zoom_in', 'zoom_out', 'orbit', 'follow'
]);
export type CameraMotion = z.infer<typeof CameraMotionEnum>;

// WAN style presets
export const WANStylePresetEnum = z.enum([
  'realistic', 'anime', 'cinematic', 'artistic'
]);
export type WANStylePreset = z.infer<typeof WANStylePresetEnum>;

// ===== CONSTRAINTS =====

export const ModeConstraintSchema = z.object({
  durationsSec: z.array(z.number()).optional(),
  qualities: z.array(QualityEnum).optional(),
  aspectRatios: z.array(AspectRatioEnum).optional(),
  maxDurationSec: z.number().optional(),
  minDurationSec: z.number().optional(),
});

export const ConstraintsByModeSchema = z.record(z.string(), ModeConstraintSchema).optional();

export type ConstraintsByMode = z.infer<typeof ConstraintsByModeSchema>;

// ===== MODEL CAPABILITY =====

export const ModelCapabilitySchema = z.object({
  id: ModelIdEnum,
  label: z.string(),
  provider: ProviderEnum,
  description: z.string().optional(),
  
  // Supported options
  supportedModes: z.array(ModeEnum),
  supportedAspectRatios: z.array(AspectRatioEnum),
  supportedDurationsSec: z.array(z.number()),
  supportedQualities: z.array(QualityEnum).optional(),
  
  // Feature flags
  supportsSound: z.boolean().optional(),
  supportsReferenceVideo: z.boolean().optional(),
  supportsReferenceImages: z.boolean().optional(),
  maxReferenceImages: z.number().optional(),
  supportsNegativePrompt: z.boolean().optional(),
  supportsStartEndFrames: z.boolean().optional(),
  
  // Model-specific features
  styleOptions: z.array(z.string()).optional(),
  cameraMotionOptions: z.array(z.string()).optional(),
  soundPresets: z.array(z.string()).optional(),
  
  // Constraints
  constraints: ConstraintsByModeSchema,
  
  // Duration config
  fixedDuration: z.number().optional(),
  durationRange: z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().optional().default(1),
  }).optional(),
  
  // API mapping
  apiId: z.string(),
  apiIdI2v: z.string().optional(),
  apiIdV2v: z.string().optional(),
  apiIdRef2v: z.string().optional(),
});

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

// ===== VIDEO GENERATION REQUEST =====

export const VideoGenerationRequestSchema = z.object({
  // Core params
  modelId: ModelIdEnum,
  mode: ModeEnum,
  prompt: z.string().min(1, 'Prompt is required'),
  negativePrompt: z.string().optional(),
  
  // Format options
  aspectRatio: AspectRatioEnum,
  durationSec: z.number().positive(),
  quality: QualityEnum.optional(),
  
  // Media inputs
  inputImage: z.string().optional(), // base64 data URL
  referenceImages: z.array(z.string()).max(3).optional(),
  referenceVideo: z.string().optional(), // URL or base64
  startImage: z.string().optional(),
  endImage: z.string().optional(),
  
  // Audio
  sound: z.boolean().optional(),
  soundPreset: z.string().optional(),
  
  // Model-specific (with enum validation)
  style: GrokStyleEnum.optional(), // Grok Video styles
  cameraMotion: CameraMotionEnum.optional(), // WAN camera motion
  stylePreset: WANStylePresetEnum.optional(), // WAN style presets
  motionStrength: z.number().min(0).max(100).optional(),
  qualityTier: z.enum(['standard', 'pro', 'master']).optional(),
  
  // Advanced
  seed: z.number().optional(),
  variants: z.number().min(1).max(4).optional().default(1),
  
  // Internal
  threadId: z.string().optional(),
}).refine(
  (data) => {
    // i2v requires inputImage
    if (data.mode === 'i2v' && !data.inputImage) {
      return false;
    }
    return true;
  },
  {
    message: 'inputImage is required for i2v mode',
    path: ['inputImage'],
  }
).refine(
  (data) => {
    // ref2v requires referenceVideo
    if (data.mode === 'ref2v' && !data.referenceVideo) {
      return false;
    }
    return true;
  },
  {
    message: 'referenceVideo is required for ref2v mode',
    path: ['referenceVideo'],
  }
).refine(
  (data) => {
    // motion_control requires referenceVideo
    if (data.mode === 'motion_control' && !data.referenceVideo) {
      return false;
    }
    return true;
  },
  {
    message: 'referenceVideo is required for motion_control mode',
    path: ['referenceVideo'],
  }
);

export type VideoGenerationRequest = z.infer<typeof VideoGenerationRequestSchema>;

// ===== VALIDATION HELPERS =====

export function validateAgainstCapability(
  request: VideoGenerationRequest,
  capability: ModelCapability
): { valid: boolean; errors: Array<{ path: string; message: string }> } {
  const errors: Array<{ path: string; message: string }> = [];
  
  // Check mode
  if (!capability.supportedModes.includes(request.mode)) {
    errors.push({
      path: 'mode',
      message: `Mode '${request.mode}' is not supported by ${capability.label}. Supported: ${capability.supportedModes.join(', ')}`,
    });
  }
  
  // Check aspect ratio
  if (!capability.supportedAspectRatios.includes(request.aspectRatio)) {
    errors.push({
      path: 'aspectRatio',
      message: `Aspect ratio '${request.aspectRatio}' is not supported by ${capability.label}. Supported: ${capability.supportedAspectRatios.join(', ')}`,
    });
  }
  
  // Check duration
  if (capability.fixedDuration !== undefined) {
    if (request.durationSec !== capability.fixedDuration) {
      errors.push({
        path: 'durationSec',
        message: `Duration must be ${capability.fixedDuration}s for ${capability.label}`,
      });
    }
  } else if (capability.durationRange) {
    const { min, max } = capability.durationRange;
    if (request.durationSec < min || request.durationSec > max) {
      errors.push({
        path: 'durationSec',
        message: `Duration must be between ${min}s and ${max}s for ${capability.label}`,
      });
    }
  } else if (!capability.supportedDurationsSec.includes(request.durationSec)) {
    errors.push({
      path: 'durationSec',
      message: `Duration ${request.durationSec}s is not supported by ${capability.label}. Supported: ${capability.supportedDurationsSec.join(', ')}s`,
    });
  }
  
  // Check quality
  if (request.quality && capability.supportedQualities) {
    if (!capability.supportedQualities.includes(request.quality)) {
      errors.push({
        path: 'quality',
        message: `Quality '${request.quality}' is not supported by ${capability.label}. Supported: ${capability.supportedQualities.join(', ')}`,
      });
    }
  }
  
  // Check sound
  if (request.sound && !capability.supportsSound) {
    errors.push({
      path: 'sound',
      message: `Sound is not supported by ${capability.label}`,
    });
  }
  
  // Check reference images
  if (request.referenceImages && request.referenceImages.length > 0) {
    if (!capability.supportsReferenceImages) {
      errors.push({
        path: 'referenceImages',
        message: `Reference images are not supported by ${capability.label}`,
      });
    } else if (capability.maxReferenceImages && request.referenceImages.length > capability.maxReferenceImages) {
      errors.push({
        path: 'referenceImages',
        message: `Maximum ${capability.maxReferenceImages} reference images allowed for ${capability.label}`,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
