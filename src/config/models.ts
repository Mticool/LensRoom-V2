/**
 * Unified Model Configuration
 * Single source of truth for all AI models with pricing in Kie credits
 */

export type ModelType = 'photo' | 'video';
export type PhotoQuality = '1k' | '2k' | '4k' | '1k_2k' | 'turbo' | 'balanced' | 'quality' | 'fast' | 'ultra';
export type VideoQuality = '720p' | '1080p' | 'fast' | 'quality';
export type VideoMode = 't2v' | 'i2v' | 'start_end' | 'storyboard';
export type PhotoMode = 't2i' | 'i2i';

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
  apiId: string;
  type: 'video';
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
  durationOptions: number[] | string[]; // e.g., [5, 10] or ['15-25']
  qualityOptions?: VideoQuality[];
  aspectRatios: string[];
  fixedDuration?: number; // If duration is fixed (e.g., Veo = 8s)
  
  // Short label for sidebar (e.g., "8s • Ultra", "5/10s • Audio")
  shortLabel?: string;
}

export type ModelConfig = PhotoModelConfig | VideoModelConfig;

// ===== PHOTO MODELS =====

export const PHOTO_MODELS: PhotoModelConfig[] = [
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    apiId: 'seedream/4.5-text-to-image',
    type: 'photo',
    description: 'Самый «рекламный» фотореал, хорошо держит композицию.',
    rank: 1,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: 6.5, // Fixed: 6.5 credits per image
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  },
  {
    id: 'flux-2',
    name: 'FLUX.2',
    apiId: 'flux/2-pro-text-to-image',
    type: 'photo',
    description: 'Топ по фактурам/материалам (предметка, упаковка, ткань, металл).',
    rank: 2,
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
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    apiId: 'google/nano-banana',
    type: 'photo',
    description: 'Быстрый и дешёвый (Gemini 2.5 Flash) — идеален для итераций и тестов.',
    rank: 3,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: 4, // ~0.02 USD per image => 4 credits (credit=0.005 USD)
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Fast',
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    apiId: 'google/nano-banana-pro',
    type: 'photo',
    description: 'Gemini 3 Pro — 4K, идеальный текст, студийное качество.',
    rank: 4,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      '1k_2k': 24, // 0.12 USD => 24 credits
      '4k': 48, // 0.24 USD => 48 credits
    },
    qualityOptions: ['1k_2k', '4k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '4K',
  },
  {
    id: 'z-image',
    name: 'Z-Image',
    apiId: 'z-image/text-to-image',
    type: 'photo',
    description: 'Ровный универсал «на всякий случай», когда другие капризничают.',
    rank: 5,
    featured: false,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: 0.8, // Fixed: 0.8 credits per image
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image',
    apiId: 'qwen/image-edit',
    type: 'photo',
    description: 'Быстрые итерации и правки, нормально переваривает RU/EN промпты.',
    rank: 7,
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
  },
  {
    id: 'imagen-4-ultra',
    name: 'Imagen 4 Ultra',
    apiId: 'google/imagen4',
    type: 'photo',
    description: 'Чистота, точность, печатный «глянец» (для бренда/маркетинга).',
    rank: 8,
    featured: false,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: false,
    pricing: {
      fast: 4,
      ultra: 12,
    },
    qualityOptions: ['fast', 'ultra'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  },
];

// ===== VIDEO MODELS =====

export const VIDEO_MODELS: VideoModelConfig[] = [
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    apiId: 'veo/3.1',
    type: 'video',
    description: 'Премиальный «кинореал» + синхро-аудио, топ под рекламу/вау-ролики.',
    rank: 1,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: true,
    supportsStartEnd: true,
    pricing: {
      fast: { '8': 80 }, // 8s, t2v only
      quality: { '8': 400 }, // 8s, supports t2v + i2v + start_end
    },
    modes: ['t2v', 'i2v', 'start_end'],
    durationOptions: [8],
    qualityOptions: ['fast', 'quality'],
    fixedDuration: 8,
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '8s • Ultra',
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    apiId: 'sora/2',
    type: 'video',
    description: 'Универсальная генерация видео: сцены, движение, стабильность.',
    rank: 2,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    pricing: 3, // 0.015 USD/sec => 3 credits/sec (credit=0.005 USD)
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '5/10s',
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    apiId: 'sora/2-pro',
    type: 'video',
    description: 'Максимум качества/стабильности сцены, когда важна «киношность».',
    rank: 3,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsStartEnd: true,
    pricing: {
      '720p': { '10': 150, '15': 270 },
      '1080p': { '10': 330, '15': 630 },
    },
    modes: ['t2v', 'i2v', 'start_end'],
    durationOptions: [10, 15],
    qualityOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '10-15s • 1080p',
  },
  {
    id: 'sora-storyboard',
    name: 'Sora Storyboard',
    apiId: 'sora/storyboard',
    type: 'video',
    description: 'Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.',
    rank: 4,
    featured: false,
    speed: 'medium',
    quality: 'high',
    supportsI2v: false,
    supportsStoryboard: true,
    pricing: {
      '10': 150,
      '15-25': 270,
    },
    modes: ['storyboard'],
    durationOptions: [10, '15-25'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '10-25s',
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    apiId: 'kling/v2-6-standard',
    type: 'video',
    description: 'Сильный универсал: динамика, эффектность, часто лучший «первый результат».',
    rank: 5,
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
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '5/10s • Audio',
  },
  {
    id: 'seedance-pro',
    name: 'Seedance Pro',
    apiId: 'seedance/pro',
    type: 'video',
    description: 'Быстрые ролики «пачкой» для тестов креативов и контент-завода.',
    rank: 6,
    featured: false,
    speed: 'fast',
    quality: 'standard',
    supportsI2v: true,
    pricing: {
      '720p': { '5': 16, '10': 36 },
    },
    modes: ['i2v'], // i2v only
    durationOptions: [5, 10],
    qualityOptions: ['720p'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '5/10s • 720p',
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
  return ALL_MODELS.find(m => m.id === id);
}

export function getFeaturedModels(type: ModelType): ModelConfig[] {
  return getModelsByType(type).filter(m => m.featured);
}
