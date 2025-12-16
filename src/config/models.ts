/**
 * Unified Model Configuration
 * Single source of truth for all AI models with pricing in Kie credits
 * 
 * KIE.ai API Documentation: https://docs.kie.ai
 * - Market API: POST https://api.kie.ai/api/v1/jobs/createTask
 * - Veo 3.1 API: POST https://api.kie.ai/api/v1/veo/generate
 */

export type ModelType = 'photo' | 'video';
export type PhotoQuality = '1k' | '2k' | '4k' | '1k_2k' | 'turbo' | 'balanced' | 'quality' | 'fast' | 'ultra';
export type VideoQuality = '720p' | '1080p' | '480p' | 'fast' | 'quality' | 'standard' | 'high';
export type VideoMode = 't2v' | 'i2v' | 'start_end' | 'storyboard';
export type PhotoMode = 't2i' | 'i2i';

// KIE API Provider type
export type KieProvider = 'kie_market' | 'kie_veo';

// Pricing structure: credits per generation
export type PhotoPricing = 
  | number // Fixed price
  | { [key in PhotoQuality]?: number } // Price by quality
  | { [resolution: string]: number }; // Price by resolution (e.g., "512x512": 1)

export type VideoPricing = 
  | number // Fixed price per second
  | { [key in VideoQuality]?: { [duration: string]: number } } // Price by quality and duration
  | { [mode: string]: { [duration: string]: number } }; // Price by mode and duration

export interface PhotoModelConfig {
  id: string;
  name: string;
  apiId: string;
  type: 'photo';
  provider: KieProvider;
  description: string;
  rank: number;
  featured: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  
  // Capabilities
  supportsI2i: boolean;
  
  // Pricing in Kie credits
  pricing: PhotoPricing;
  
  // Available options
  qualityOptions?: PhotoQuality[];
  aspectRatios: string[];
  
  // Short label for sidebar (e.g., "8s • Ultra")
  shortLabel?: string;
}

export interface VideoModelConfig {
  id: string;
  name: string;
  apiId: string; // For t2v mode
  apiIdI2v?: string; // For i2v mode (some models have different endpoints)
  type: 'video';
  provider: KieProvider;
  description: string;
  rank: number;
  featured: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  
  // Capabilities
  supportsI2v: boolean;
  supportsAudio?: boolean;
  supportsStartEnd?: boolean;
  supportsStoryboard?: boolean;
  
  // Pricing in Kie credits
  pricing: VideoPricing;
  
  // Available options
  modes: VideoMode[];
  durationOptions: (number | string)[]; // e.g., [5, 10] or ['15-25'] or [10, '15-25']
  qualityOptions?: VideoQuality[];
  resolutionOptions?: string[]; // For models with resolution selection
  aspectRatios: string[];
  fixedDuration?: number; // If duration is fixed (e.g., Veo = 8s)
  
  // Short label for sidebar (e.g., "8s • Ultra", "5/10s • Audio")
  shortLabel?: string;
}

export type ModelConfig = PhotoModelConfig | VideoModelConfig;

// ===== PHOTO MODELS =====
// All photo models use kie_market provider: POST /api/v1/jobs/createTask

export const PHOTO_MODELS: PhotoModelConfig[] = [
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    apiId: 'google/nano-banana',
    type: 'photo',
    provider: 'kie_market',
    description: 'Быстрый и дешёвый (Gemini 2.5 Flash) — идеален для итераций и тестов.',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: 4, // ~0.02 USD per image => 4 credits (credit=0.005 USD)
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Fast',
  },
  {
    id: 'imagen-4',
    name: 'Imagen 4',
    apiId: 'google/imagen4',
    type: 'photo',
    provider: 'kie_market',
    description: 'Чистота, точность, печатный «глянец» (для бренда/маркетинга).',
    rank: 2,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: false,
    pricing: {
      fast: 4,
      ultra: 12,
    },
    qualityOptions: ['fast', 'ultra'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Ultra',
  },
  // Seedream 4.5: requires `quality` (basic/high), NOT `resolution`
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    apiId: 'seedream/4.5-text-to-image',
    type: 'photo',
    provider: 'kie_market',
    description: 'Премиальный фотореал. В KIE требуется quality: basic(2K)/high(4K).',
    rank: 3,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      quality: 6.5,
      ultra: 10,
    },
    qualityOptions: ['quality', 'ultra'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
    shortLabel: '2K/4K',
  },
  {
    id: 'flux-2-pro',
    name: 'FLUX.2 Pro',
    apiId: 'flux-2/pro-text-to-image', // Correct API ID - WORKING!
    type: 'photo',
    provider: 'kie_market',
    description: 'Топ по фактурам/материалам (предметка, упаковка, ткань, металл). Требует resolution И aspect_ratio.',
    rank: 3,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      '1k': 5,
      '2k': 7,
    },
    qualityOptions: ['1k', '2k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Pro',
  },
  // Z-image: model id is "z-image" (per docs)
  {
    id: 'z-image',
    name: 'Z-image',
    apiId: 'z-image',
    type: 'photo',
    provider: 'kie_market',
    description: 'Универсальный генератор. По докам KIE используется model: "z-image".',
    rank: 5,
    featured: false,
    speed: 'medium',
    quality: 'high',
    supportsI2i: true,
    pricing: 0.8,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Budget',
  },
  // Qwen Image Edit: requires image_url (i2i only)
  {
    id: 'qwen-image',
    name: 'Qwen Image Edit',
    apiId: 'qwen/image-edit',
    type: 'photo',
    provider: 'kie_market',
    description: 'Редактирование изображения по промпту (требует референс).',
    rank: 6,
    featured: false,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      '512x512': 1,
      '1024x1024': 3.5,
      '768x1024': 2.5,
      '576x1024': 2,
      '1024x768': 2.5,
      '1024x576': 2,
    },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Edit',
  },
];

// ===== VIDEO MODELS =====
// KIE.ai Video API Documentation: https://docs.kie.ai
// - Market API: POST /api/v1/jobs/createTask (kling, sora, bytedance)
// - Veo 3.1 API: POST /api/v1/veo/generate (separate endpoint)

export const VIDEO_MODELS: VideoModelConfig[] = [
  // === VEO 3.1 - single model with quality toggle ===
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    apiId: 'veo3', // actual selection is via `qualityOptions` fast/quality in API client
    type: 'video',
    provider: 'kie_veo', // Separate Veo API
    description: 'Премиальный «кинореал» + синхро-аудио, топ под рекламу/вау-ролики.',
    rank: 1,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: true,
    pricing: {
      quality: { '8': 400 },
      fast: { '8': 80 },
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [8],
    qualityOptions: ['quality', 'fast'],
    // Veo rejects 1:1 with "Ratio error" (422) — keep only supported ratios.
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '8s • Ultra',
  },
  
  // === KLING 2.6 - Market API ===
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    apiId: 'kling-2.6/text-to-video', // For t2v mode
    apiIdI2v: 'kling-2.6/image-to-video', // For i2v mode
    type: 'video',
    provider: 'kie_market',
    description: 'Сильный универсал: динамика, эффектность, часто лучший «первый результат».',
    rank: 3,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: true,
    pricing: {
      '5': { no_audio: 55, audio: 110 },
      '10': { no_audio: 110, audio: 220 },
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    aspectRatios: ['1:1', '16:9', '9:16'],
    shortLabel: '5/10s • Audio',
  },

  // === SORA 2 - Market API (i2v only) ===
  {
    id: 'sora-2',
    name: 'Sora 2',
    apiId: 'sora-2-image-to-video', // i2v only
    type: 'video',
    provider: 'kie_market',
    description: 'Универсальная генерация видео: сцены, движение, стабильность.',
    rank: 4,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    pricing: {
      '10': { standard: 150 },
      '15': { standard: 270 },
    },
    modes: ['i2v'], // Only i2v supported
    durationOptions: [10, 15],
    aspectRatios: ['portrait', 'landscape'], // KIE uses portrait/landscape
    shortLabel: '10/15s',
  },

  // === SORA 2 PRO - Market API (i2v) ===
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    apiId: 'sora-2-pro-image-to-video', // i2v
    type: 'video',
    provider: 'kie_market',
    description: 'Максимум качества/стабильности сцены, когда важна «киношность».',
    rank: 5,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsStartEnd: true,
    pricing: {
      'standard': { '10': 150, '15': 270 },
      'high': { '10': 330, '15': 630 },
    },
    modes: ['i2v', 'start_end'],
    durationOptions: [10, 15],
    qualityOptions: ['standard', 'high'],
    aspectRatios: ['portrait', 'landscape'],
    shortLabel: '10-15s • 1080p',
  },

  // === SORA STORYBOARD - Market API ===
  {
    id: 'sora-storyboard',
    name: 'Sora Storyboard',
    apiId: 'sora-2-pro-storyboard',
    type: 'video',
    provider: 'kie_market',
    description: 'Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.',
    rank: 6,
    featured: false,
    speed: 'medium',
    quality: 'high',
    supportsI2v: false,
    supportsStoryboard: true,
    pricing: {
      storyboard: {
        '10': 150,
        '15-25': 270,
      },
    },
    modes: ['storyboard'],
    durationOptions: [10, '15-25'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '10-25s',
  },

  // === BYTEDANCE (Seedance) - Market API (i2v only) ===
  {
    id: 'bytedance-pro',
    name: 'Bytedance Pro',
    apiId: 'bytedance/v1-pro-image-to-video', // i2v only
    type: 'video',
    provider: 'kie_market',
    description: 'Быстрые ролики «пачкой» для тестов креативов и контент-завода.',
    rank: 7,
    featured: false,
    speed: 'fast',
    quality: 'standard',
    supportsI2v: true,
    pricing: {
      '480p': { '5': 12, '10': 24 },
      '720p': { '5': 16, '10': 36 },
      '1080p': { '5': 24, '10': 48 },
    },
    modes: ['i2v'], // i2v only
    durationOptions: [5, 10],
    resolutionOptions: ['480p', '720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '5/10s • Fast',
  },
];

// ===== ALL MODELS =====

export const ALL_MODELS: ModelConfig[] = [
  ...PHOTO_MODELS,
  ...VIDEO_MODELS,
];

// ===== HELPER FUNCTIONS =====

export function getModelsByType(type: ModelType): ModelConfig[] {
  return ALL_MODELS.filter(m => m.type === type).sort((a, b) => a.rank - b.rank);
}

export function getModelById(id: string): ModelConfig | undefined {
  // Backward-compatible aliases (older URLs/localStorage)
  if (id === 'veo-3.1-fast' || id === 'veo-3.1-quality') {
    id = 'veo-3.1';
  }
  return ALL_MODELS.find(m => m.id === id);
}

export function getFeaturedModels(type: ModelType): ModelConfig[] {
  return getModelsByType(type).filter(m => m.featured);
}

