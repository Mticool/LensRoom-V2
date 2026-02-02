import { ModelCapability } from './schema';

/**
 * VIDEO MODEL CAPABILITIES
 * 
 * Single source of truth for video model capabilities.
 * 
 * Adding a new model:
 * 1. Define ModelCapability in this file
 * 2. Add to VIDEO_MODELS array
 * 3. Implement provider mapping in lib/providers/kie/video.ts
 * 4. UI will automatically adapt to new capabilities
 * 5. Backend will enforce validation
 */

export const VIDEO_MODELS: ModelCapability[] = [
  // ===== VEO 3.1 FAST - Google =====
  {
    id: 'veo-3.1-fast',
    label: 'Veo 3.1 Fast',
    provider: 'laozhang',
    description: 'Veo 3.1 Fast от Google — быстрая генерация видео высокого качества с поддержкой референсов и продления',
    apiId: 'veo-3.1-fast',

    supportedModes: ['t2v', 'i2v', 'start_end', 'extend'],
    supportedAspectRatios: ['auto', '16:9', '9:16'],
    supportedDurationsSec: [4, 6, 8],
    supportedQualities: ['720p', '1080p'],

    supportsSound: false,
    supportsReferenceVideo: false,
    supportsReferenceImages: true, // Multi-Image Reference поддерживается
    supportsStartEndFrames: true,

    constraints: undefined,
  },
  
  // ===== KLING 2.6 =====
  {
    id: 'kling-2.6',
    label: 'Kling 2.6',
    provider: 'kie',
    description: 'Kling 2.6 Standard — отличная динамика с поддержкой звука',
    apiId: 'kling-2.6/text-to-video',
    apiIdI2v: 'kling-2.6/image-to-video',

    supportedModes: ['t2v', 'i2v'],
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    supportedDurationsSec: [5, 10],
    supportedQualities: ['720p', '1080p'],

    supportsSound: true,
    supportsStartEndFrames: false, // НЕ ПОДДЕРЖИВАЕТ start/end frames

    constraints: undefined,
  },
  
  // ===== KLING 2.5 =====
  {
    id: 'kling-2.5',
    label: 'Kling 2.5',
    provider: 'kie',
    description: 'Kling 2.5 Turbo — быстрая генерация с балансом скорости и качества',
    apiId: 'kling-2.5-turbo/text-to-video',
    apiIdI2v: 'kling-2.5-turbo/image-to-video',

    supportedModes: ['t2v', 'i2v'],
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    supportedDurationsSec: [5, 10],
    supportedQualities: ['720p', '1080p'],

    supportsSound: false,
    supportsStartEndFrames: false, // НЕ ПОДДЕРЖИВАЕТ start/end frames

    constraints: undefined,
  },
  
  // ===== KLING 2.1 =====
  {
    id: 'kling-2.1',
    label: 'Kling 2.1',
    provider: 'kie',
    description: 'Kling 2.1 Master — высокое качество генерации с тремя уровнями качества',
    apiId: 'kling-2.1/text-to-video',
    apiIdI2v: 'kling-2.1/image-to-video',

    supportedModes: ['t2v', 'i2v', 'start_end'], // Pro режим поддерживает tail_image_url
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    supportedDurationsSec: [5, 10],
    supportedQualities: ['720p', '1080p', 'standard', 'pro', 'master'],

    supportsSound: false,
    supportsStartEndFrames: true, // Только для Pro/Master качества

    constraints: undefined,
  },
  
  // ===== GROK VIDEO - xAI =====
  {
    id: 'grok-video',
    label: 'Grok Video',
    provider: 'kie',
    description: 'Grok Video от xAI — создаёт видео с синхронизированным звуком и режимами Fun/Normal/Spicy',
    apiId: 'grok-imagine/text-to-video',

    supportedModes: ['t2v', 'i2v'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '2:3', '3:2'],
    supportedDurationsSec: [6, 10],

    supportsSound: true,
    supportsReferenceImages: false,

    styleOptions: ['normal', 'fun', 'spicy'],

    constraints: undefined,
  },
  
  // ===== SORA 2 - OpenAI via LaoZhang =====
  {
    id: 'sora-2',
    label: 'Sora 2',
    provider: 'laozhang',
    description: 'OpenAI Sora 2 — универсальная генерация 10/15 сек, 720p с синхронизацией звука',
    apiId: 'sora_video2', // Base model: 704×1280 portrait 10s

    supportedModes: ['t2v', 'i2v'],
    supportedAspectRatios: ['16:9', '9:16'], // portrait (9:16) или landscape (16:9)
    supportedDurationsSec: [10, 15], // 10s базовая, 15s расширенная
    supportedQualities: ['720p'], // Базовая модель 720p, sora-2-pro = HD/1080p

    supportsSound: true, // Audio-video synchronization
    supportsReferenceImages: true, // Поддерживает до 1 референс изображения для I2V

    constraints: undefined,
  },
  
  // ===== WAN 2.6 =====
  {
    id: 'wan-2.6',
    label: 'WAN 2.6',
    provider: 'kie',
    description: 'WAN 2.6 — кинематографическая генерация до 15 сек с управлением камерой и синхронизированным аудио',
    apiId: 'wan-2.6/text-to-video',
    apiIdI2v: 'wan-2.6/image-to-video',
    apiIdV2v: 'wan-2.6/video-to-video',

    supportedModes: ['t2v', 'i2v', 'v2v'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurationsSec: [5, 10, 15],
    supportedQualities: ['720p', '1080p'],

    supportsSound: true, // Synced audio + lip sync
    supportsReferenceVideo: true, // R2V режим

    cameraMotionOptions: [
      'static',
      'pan_left',
      'pan_right',
      'tilt_up',
      'tilt_down',
      'zoom_in',
      'zoom_out',
      'orbit',
      'follow',
    ],
    styleOptions: ['realistic', 'cinematic', 'anime', 'cartoon'],

    constraints: undefined,
  },
  
  // ===== KLING 2.6 MOTION CONTROL =====
  {
    id: 'kling-motion-control',
    label: 'Kling Motion Control',
    provider: 'kie',
    description: 'Kling 2.6 Motion Control — передача движения из референсного видео',
    apiId: 'kling-2.6-motion-control',
    
    supportedModes: ['motion_control'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurationsSec: [5, 10, 15, 30],
    supportedQualities: ['720p', '1080p'],
    
    durationRange: {
      min: 3,
      max: 30,
      step: 1,
    },
    
    supportsSound: false,
    supportsReferenceVideo: true,
    
    constraints: {
      motion_control: {
        minDurationSec: 3,
        maxDurationSec: 30,
      },
    },
  },
];

// ===== LOOKUP MAP =====

export const VIDEO_MODELS_BY_ID: Record<string, ModelCapability> = VIDEO_MODELS.reduce(
  (acc, model) => {
    acc[model.id] = model;
    return acc;
  },
  {} as Record<string, ModelCapability>
);

// ===== HELPER FUNCTIONS =====

export function getModelCapability(modelId: string): ModelCapability | undefined {
  return VIDEO_MODELS_BY_ID[modelId];
}

export function getDefaultsForModel(modelId: string): {
  mode: string;
  aspectRatio: string;
  durationSec: number;
  quality?: string;
} | null {
  const capability = getModelCapability(modelId);
  if (!capability) return null;
  
  return {
    mode: capability.supportedModes[0],
    aspectRatio: capability.supportedAspectRatios[0],
    durationSec: capability.fixedDuration || capability.supportedDurationsSec[0],
    quality: capability.supportedQualities?.[0],
  };
}

export function getCapabilitySummary(modelId: string): string {
  const capability = getModelCapability(modelId);
  if (!capability) return '';
  
  const parts: string[] = [];
  
  // Modes
  const modeLabels = {
    t2v: 'T2V',
    i2v: 'I2V',
    start_end: 'Frames',
    ref2v: 'Ref2V',
    v2v: 'V2V',
    motion_control: 'Motion',
    extend: 'Extend',
  };
  parts.push(capability.supportedModes.map(m => modeLabels[m] || m).join('/'));
  
  // Duration
  if (capability.fixedDuration) {
    parts.push(`${capability.fixedDuration}s`);
  } else if (capability.durationRange) {
    parts.push(`${capability.durationRange.min}-${capability.durationRange.max}s`);
  } else {
    const durations = capability.supportedDurationsSec;
    if (durations.length <= 3) {
      parts.push(durations.map(d => `${d}s`).join('/'));
    } else {
      parts.push(`${durations[0]}-${durations[durations.length - 1]}s`);
    }
  }
  
  // Quality
  if (capability.supportedQualities && capability.supportedQualities.length > 0) {
    parts.push(capability.supportedQualities.join('/'));
  }
  
  // Audio
  if (capability.supportsSound) {
    parts.push('Audio');
  }
  
  return parts.join(' • ');
}
