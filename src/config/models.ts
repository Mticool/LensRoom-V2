/**
 * Unified Model Configuration
 * Single source of truth for all AI models with pricing in Kie credits
 * 
 * KIE.ai API Documentation: https://docs.kie.ai
 * - Market API: POST https://api.kie.ai/api/v1/jobs/createTask
 * - Veo 3.1 API: POST https://api.kie.ai/api/v1/veo/generate
 */

export type ModelType = 'photo' | 'video';
export type PhotoQuality =
  | '1k'
  | '2k'
  | '4k'
  | '8k'
  | '1k_2k'
  | 'turbo'
  | 'balanced'
  | 'quality'
  | 'fast'
  | 'ultra'
  | 'medium' // OpenAI GPT Image 1.5
  | 'high' // OpenAI GPT Image 1.5
  // Ideogram Character packs
  | 'a_12cred'
  | 'a_18cred'
  | 'a_24cred'
  | 'b_36cred'
  | 'b_45cred'
  | 'b_54cred'
  | 'c_48cred'
  | 'c_60cred'
  | 'c_72cred';
export type VideoQuality = '720p' | '1080p' | '480p' | '580p' | 'fast' | 'quality' | 'standard' | 'high';
export type VideoMode = 't2v' | 'i2v' | 'start_end' | 'storyboard' | 'reference' | 'v2v';
export type PhotoMode = 't2i' | 'i2i';

// KIE API Provider type
export type KieProvider = 'kie_market' | 'kie_veo' | 'openai' | 'fal';

// Pricing structure: credits per generation
export type PhotoPricing = 
  | number // Fixed price
  | { [key in PhotoQuality]?: number } // Price by quality
  | { [resolution: string]: number }; // Price by resolution (e.g., "512x512": 1)

export type VideoPricing = 
  | number // Fixed price per second
  | { [key in VideoQuality]?: { [duration: string]: number } } // Price by quality and duration
  | { [mode: string]: { [duration: string]: number } } // Price by mode and duration
  | { [duration: string]: number | { audio?: number; no_audio?: number } }; // Price by duration (with optional audio/no_audio)

export interface PhotoModelConfig {
  id: string;
  name: string;
  apiId: string;
  type: 'photo';
  provider: KieProvider;
  description: string; // расширенное описание для генератора
  shortDescription?: string; // короткое описание для списка (до 60 символов)
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
  // Some models have a fixed output resolution regardless of quality (e.g. FLUX 1K/2K variants, Topaz 4K/8K)
  fixedResolution?: '1K' | '2K' | '4K' | '8K';
  
  // Short label for sidebar (e.g., "8s • Ultra")
  shortLabel?: string;
}

export interface VideoModelVariant {
  id: string; // e.g., "kling-2.5-turbo", "kling-2.6", "kling-2.1", "wan-2.5", "wan-2.6"
  name: string; // Display name
  apiId: string; // For t2v mode
  apiIdI2v?: string; // For i2v mode
  apiIdV2v?: string; // For v2v mode (reference-guided)
  pricing: VideoPricing; // Pricing for this variant (same structure as VideoModelConfig.pricing)
  perSecondPricing?: { [resolution: string]: number }; // For per-second pricing (e.g., WAN 2.5: { "720p": 18, "1080p": 30 })
  // Variant-specific options (override parent model defaults)
  modes?: string[]; // e.g., ['t2v', 'i2v'] for WAN 2.5, ['t2v', 'i2v', 'v2v'] for WAN 2.6
  durationOptions?: (number | string)[]; // e.g., [5, 10] for WAN 2.5, [5, 10, 15] for WAN 2.6
  resolutionOptions?: string[]; // e.g., ['720p', '1080p'] for WAN 2.5, ['720p', '1080p', '1080p_multi'] for WAN 2.6
  aspectRatios?: string[]; // e.g., ['16:9', '9:16', '1:1']
  soundOptions?: string[]; // e.g., ['native', 'lip-sync', 'ambient', 'music'] for WAN 2.5
}

export interface VideoModelConfig {
  id: string;
  name: string;
  apiId: string; // For t2v mode (default, used if no variants)
  apiIdI2v?: string; // For i2v mode (default, used if no variants)
  apiIdV2v?: string; // For v2v mode (reference-guided video-to-video)
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
  
  // Pricing in Kie credits (used if no variants)
  pricing: VideoPricing;
  
  // Model variants (for unified models like Kling)
  modelVariants?: VideoModelVariant[];
  
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
  // === GROK IMAGINE - xAI === (Text-to-Image with Spicy Mode)
  {
    id: 'grok-imagine',
    name: 'Grok Imagine',
    apiId: 'grok-imagine/text-to-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'xAI: креативные изображения с Spicy Mode 🌶️',
    description: 'Grok Imagine от xAI — мультимодальная модель с тремя режимами: Normal, Fun и Spicy. Spicy Mode создаёт более выразительные и креативные результаты.',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: false,
    pricing: 15, // Примерная цена
    aspectRatios: ['1:1', '3:2', '2:3'],
    shortLabel: 'xAI 🌶️',
  },
  // === MIDJOURNEY - KIE Market API === (ВРЕМЕННО СКРЫТО - требует активации в KIE)
  // Раскомментировать когда модель будет доступна в аккаунте KIE
  /*
  {
    id: 'midjourney',
    name: 'Midjourney V7',
    apiId: 'midjourney',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Арт и стиль высочайшего качества.',
    description: 'Midjourney — когда нужен стиль, арт и «дорогая картинка» с характером. Лучший выбор для креативных задач, постеров и художественных визуалов.',
    rank: 1,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      fast: 14,
      turbo: 27,
    },
    qualityOptions: ['fast', 'turbo'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '5:6', '6:5', '2:1', '1:2'],
    shortLabel: 'V7 • Art',
  },
  */
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    apiId: 'google/nano-banana',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Фотореализм и "вкусная" картинка за секунды.',
    description: 'Лучший универсал на каждый день: стабильный реализм, хорошие лица, одежда, предметка. Подходит для быстрых тестов идей и массового контента.',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 4 credits = 7⭐
      turbo: 7,
      balanced: 7,
      quality: 7,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Turbo/Quality',
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    apiId: 'nano-banana-pro',  // KIE API uses this format (without google/ prefix)
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Максимум качества: детали, кожа, свет, чистые текстуры.',
    description: 'Премиальная версия для коммерции: более точные материалы, лучше мелкие детали, меньше артефактов. Выбирай, когда картинка "должна продавать".',
    rank: 2,
    featured: true,
    speed: 'fast',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 1k_2k (18 credits) = 30⭐, 4k (24 credits) = 40⭐
      '1k_2k': 30,
      '4k': 40,
    },
    qualityOptions: ['1k_2k', '4k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Pro • 1K-4K',
  },
  // Seedream 4.5: requires `quality` (basic/high), NOT `resolution`
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    apiId: 'seedream/4.5-text-to-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Новая версия: больше качества и стабильности в стиле.',
    description: 'Улучшенная Seedream: лучше детали и чище результат. Отлично для современных визуалов и креативной графики.',
    rank: 9,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 6.5 credits = 11⭐
      turbo: 11,
      balanced: 11,
      quality: 11,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
    shortLabel: 'Turbo/Quality',
  },
  {
    id: 'flux-2-pro',
    name: 'FLUX.2 Pro',
    apiId: 'flux-2/pro-text-to-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Резко, детально, "дорого" выглядит.',
    description: 'Сильная генерация для стильных и детализированных картинок. Хорош для продуктовых сцен, интерьеров, fashion-кадров и "премиум-визуала".',
    rank: 6,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 1k (5 credits) = 9⭐, 2k (7 credits) = 12⭐
      '1k': 9,
      '2k': 12,
    },
    qualityOptions: ['1k', '2k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '1K/2K',
  },
  // Z-image: model id is "z-image" (per docs)
  {
    id: 'z-image',
    name: 'Z-image',
    apiId: 'z-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Универсальный генератор изображений.',
    description: 'Универсальный генератор изображений.',
    rank: 14,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 0.8 credit = 2⭐
      turbo: 2,
      balanced: 2,
      quality: 2,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: '2⭐',
  },
  // NOTE: Ideogram V3 is currently unavailable on KIE API (422 error)
  // Keeping config for future use when model becomes available
  /*
  {
    id: 'ideogram-v3',
    name: 'Ideogram V3',
    apiId: 'ideogram/v3',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Когда важен текст на изображении и постерный стиль.',
    description: 'Лучший выбор для баннеров, обложек, постеров и инфографики. Держит текст лучше большинства моделей и даёт аккуратную "дизайнерскую" подачу.',
    rank: 7,
    featured: false,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: false,
    pricing: {
      turbo: 6,
      balanced: 12,
      quality: 17,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'V3',
  },
  */
  {
    id: 'recraft-remove-background',
    name: 'Recraft Remove Background',
    apiId: 'recraft/remove-background',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Удаление фона за 1 клик.',
    description: 'Быстрый инструмент для вырезки объекта и прозрачного фона. Полезно для карточек, превью и маркетинговых материалов.',
    rank: 12,
    featured: false,
    speed: 'fast',
    quality: 'standard',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 1 credit = 2⭐
      turbo: 2,
      balanced: 2,
      quality: 2,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'No BG',
  },
  {
    id: 'topaz-image-upscale',
    name: 'Topaz Image Upscale',
    apiId: 'topaz/image-upscale',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Апскейл до 4K/8K для печати и рекламы.',
    description: 'Поднимает разрешение и детали. Используй для финальных материалов: баннеры, печать, крупные форматы, "чтобы не мыло".',
    rank: 13,
    featured: false,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      // NEW PRICING: 2k (10 credits) = 17⭐, 4k (20 credits) = 34⭐, 8k (40 credits) = 67⭐
      '2k': 17,
      '4k': 34,
      '8k': 67,
    },
    qualityOptions: ['2k', '4k', '8k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '≤2K/4K/8K',
  },
  
  // === GPT IMAGE - OpenAI ===
  // Snapshot: gpt-image-1 (or gpt-image-1.5-2025-12-16)
  // Sizes: 1024x1024 (1:1), 1024x1536 (9:16), 1536x1024 (16:9)
  // Quality: medium, high
  // GPT Image 1.5 - OpenAI (via KIE.ai)
  // Документация: https://kie.ai/gpt-image-1.5
  // Pricing: medium = быстро, high = детали. До 16 изображений для редактирования.
  {
    id: 'gpt-image',
    name: 'GPT Image 1.5',
    apiId: 'gpt-image/1.5-text-to-image',
    type: 'photo',
    provider: 'kie_market', // Теперь через KIE API
    shortDescription: 'OpenAI 1.5: 4x быстрее, лучше текст, до 16 фото для редактирования.',
    description: 'GPT Image 1.5 — улучшенная модель OpenAI. Генерация в 4x быстрее, точнее рендерит текст на изображениях, поддерживает редактирование до 16 фото одновременно.',
    rank: 3,
    featured: true,
    speed: 'fast',
    quality: 'ultra',
    supportsI2i: true, // До 16 изображений для редактирования
    pricing: {
      // medium = быстро и экономно, high = максимум деталей
      medium: 17,
      high: 67,
    },
    qualityOptions: ['medium', 'high'],
    aspectRatios: ['1:1', '3:2', '2:3'], // Новые пропорции из документации
    shortLabel: 'OpenAI 1.5',
  },
];

// ===== VIDEO MODELS =====
// KIE.ai Video API Documentation: https://docs.kie.ai
// - Market API: POST /api/v1/jobs/createTask (kling, sora, bytedance)
// - Veo 3.1 API: POST /api/v1/veo/generate (separate endpoint)

export const VIDEO_MODELS: VideoModelConfig[] = [
  // === GROK VIDEO - xAI === (Text-to-Video + Image-to-Video with Spicy Mode)
  {
    id: 'grok-video',
    name: 'Grok Video',
    apiId: 'grok-imagine/text-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'Grok Video от xAI — создаёт короткие видео с синхронизированным звуком. Поддерживает Text-to-Video и Image-to-Video с тремя режимами: Normal, Fun, Spicy 🌶️',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: true,
    supportsStartEnd: false,
    pricing: 25, // Примерная цена
    modes: ['t2v', 'i2v'],
    durationOptions: [5],
    aspectRatios: ['1:1', '3:2', '2:3'],
    shortLabel: 'xAI 🌶️',
  },
  // === VEO 3.1 - single model with quality toggle ===
  // ОБНОВЛЕНО 2025-01-03: Fast 99⭐, Quality 490⭐
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    apiId: 'veo3', // actual selection is via `qualityOptions` fast/quality in API client
    type: 'video',
    provider: 'kie_veo', // Separate Veo API
    description: 'Самая быстрая модель для видео (8 сек за ~1 минуту). Отличное качество, стабильная физика, хорошо держит движение камеры и объекты.',
    rank: 1,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: true,
    supportsStartEnd: true, // First & last frame support
    pricing: {
      // ЮНИТКА 2025-01-03: fast=99⭐, quality=490⭐
      fast: { '8': 99 },
      quality: { '8': 490 },
    },
    modes: ['t2v', 'i2v', 'start_end', 'reference'], // Added reference mode
    durationOptions: [8],
    // Default to fast (per UX requirement); can be switched to quality in UI.
    qualityOptions: ['fast', 'quality'],
    // Veo rejects 1:1 with "Ratio error" (422) — keep only supported ratios.
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '8s • от 99⭐',
  },
  
  // === KLING - Unified model with variants (2.5 Turbo, 2.6, 2.1) ===
  // ОБНОВЛЕНО 2025-01-03: новые цены по юнитке
  {
    id: 'kling',
    name: 'Kling',
    apiId: 'kling-2.6/text-to-video', // Default (will be overridden by variant)
    apiIdI2v: 'kling-2.6/image-to-video', // Default
    type: 'video',
    provider: 'kie_market',
    description: 'Сильный универсал для эффектных видео: отличная динамика, стабильные объекты, хорошо работает с людьми и экшеном. Три версии на выбор.',
    rank: 3,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: true, // Audio only for 2.6
    pricing: {
      '5': { no_audio: 105 }, // Minimum price (2.5 Turbo 5s)
      '10': { no_audio: 210 }, // Minimum price (2.5 Turbo 10s)
    },
    modelVariants: [
      {
        id: 'kling-2.5-turbo',
        name: 'Kling 2.5 Turbo',
        apiId: 'kling-2.5-turbo/text-to-video',
        pricing: {
          // ЮНИТКА 2025-01-03: 5s=105⭐, 10s=210⭐
          '5': { no_audio: 105 },
          '10': { no_audio: 210 },
        },
      },
      {
        id: 'kling-2.6',
        name: 'Kling 2.6',
        apiId: 'kling-2.6/text-to-video',
        apiIdI2v: 'kling-2.6/image-to-video',
        pricing: {
          // ЮНИТКА 2025-01-03: audio 5s=135⭐, 10s=270⭐
          // no_audio остаётся дешевле
          '5': { no_audio: 105, audio: 135 },
          '10': { no_audio: 210, audio: 270 },
        },
      },
      {
        id: 'kling-2.1',
        name: 'Kling 2.1 Pro',
        apiId: 'kling/v2-1-pro',
        pricing: {
          // ЮНИТКА 2025-01-03: 5s=200⭐, 10s=400⭐
          '5': { no_audio: 200 },
          '10': { no_audio: 400 },
        },
      },
    ],
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    aspectRatios: ['1:1', '16:9', '9:16'],
    shortLabel: 'от 105⭐',
  },

  // === SORA 2 - Market API (i2v only) ===
  {
    id: 'sora-2',
    name: 'Sora 2',
    apiId: 'sora-2-image-to-video', // i2v only
    type: 'video',
    provider: 'kie_market',
    description: 'OpenAI Sora 2: универсальная генерация с балансом качества и скорости. Подходит для большинства задач.',
    rank: 4,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    pricing: {
      // NEW PRICING: 10s (30 credits) = 50⭐, 15s (30 credits) = 50⭐
      '10': { standard: 50 },
      '15': { standard: 50 },
    },
    modes: ['i2v'], // Only i2v supported
    durationOptions: [10, 15],
    aspectRatios: ['portrait', 'landscape'],
    shortLabel: '10/15s',
  },

  // === SORA 2 PRO - Market API (i2v only) ===
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    apiId: 'sora-2-pro-image-to-video', // i2v only
    type: 'video',
    provider: 'kie_market',
    description: 'OpenAI Sora 2 Pro: максимальное качество и стабильность сцены. Когда важна "киношность" и чистота кадра.',
    rank: 5,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    pricing: {
      // NEW PRICING: standard: 10s = 250⭐; 15s = 450⭐; high: 10s = 550⭐; 15s = 1050⭐
      'standard': { '10': 250, '15': 450 },
      'high': { '10': 550, '15': 1050 },
    },
    modes: ['i2v'], // Only i2v, start_end is Veo feature
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
        '10': 220,
        '15-25': 400,
      },
    },
    modes: ['storyboard'],
    durationOptions: [10, '15-25'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '10-25s',
  },

  // === WAN - Unified model with variants (2.5 / 2.6 only) ===
  {
    id: 'wan',
    name: 'WAN',
    apiId: 'wan/2-6-text-to-video', // Default (will be overridden by variant)
    apiIdI2v: 'wan/2-6-image-to-video', // Default
    apiIdV2v: 'wan/2-6-video-to-video', // V2V (reference-guided)
    type: 'video',
    provider: 'kie_market',
    description: 'Кинематографичное качество для сторителлинга, бренд-роликов и talking-head. Версии 2.5/2.6 с поддержкой T2V, I2V, V2V и звука.',
    rank: 8,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: true, // Sound presets supported
    pricing: {
      '5': { no_audio: 100 }, // Minimum price (WAN 2.5 720p 5s)
      '10': { no_audio: 200 },
      '15': { no_audio: 300 },
    },
    modelVariants: [
      {
        id: 'wan-2.5',
        name: 'Wan 2.5',
        apiId: 'wan/2-5-text-to-video',
        apiIdI2v: 'wan/2-5-image-to-video',
        // WAN 2.5: T2V, I2V | 5s, 10s | 720p, 1080p | 16:9, 9:16, 1:1
        // Sound: native, lip-sync, ambient, music
        modes: ['t2v', 'i2v'],
        durationOptions: [5, 10],
        resolutionOptions: ['720p', '1080p'],
        aspectRatios: ['16:9', '9:16', '1:1'],
        soundOptions: ['native', 'lip-sync', 'ambient', 'music'],
        pricing: {
          '720p': { '5': 100, '10': 200 },
          '1080p': { '5': 168, '10': 335 },
        },
      },
      {
        id: 'wan-2.6',
        name: 'Wan 2.6',
        apiId: 'wan/2-6-text-to-video',
        apiIdI2v: 'wan/2-6-image-to-video',
        apiIdV2v: 'wan/2-6-video-to-video',
        // WAN 2.6: T2V, I2V, V2V (R2V) | 5s, 10s, 15s | 720p, 1080p, Multi-shot 1080p | 16:9, 9:16, 1:1
        // Sound: native-dialogues, precise-lip-sync, ambient-atmospheric
        modes: ['t2v', 'i2v', 'v2v'],
        durationOptions: [5, 10, 15],
        resolutionOptions: ['720p', '1080p', '1080p_multi'],
        aspectRatios: ['16:9', '9:16', '1:1'],
        soundOptions: ['native-dialogues', 'precise-lip-sync', 'ambient-atmospheric'],
        pricing: {
          '720p': { '5': 118, '10': 235, '15': 351 },
          '1080p': { '5': 175, '10': 351, '15': 528 },
          '1080p_multi': { '5': 220, '10': 440, '15': 660 },
        },
      },
    ],
    modes: ['t2v', 'i2v', 'v2v'], // All modes (filtered by variant)
    durationOptions: [5, 10, 15], // All durations (filtered by variant)
    resolutionOptions: ['720p', '1080p', '1080p_multi'], // All resolutions (filtered by variant)
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: 'от 100⭐',
  },

  // === BYTEDANCE (Seedance 1.0 Pro) - Market API (i2v only) ===
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
      // NEW PRICING: 720p: 5s=27⭐, 10s=61⭐; 1080p: 5s=61⭐, 10s=121⭐
      '720p': { '5': 27, '10': 61 },
      '1080p': { '5': 61, '10': 121 },
    },
    modes: ['i2v'], // i2v only
    durationOptions: [5, 10],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '5/10s • Fast',
  },

  // === KLING AI AVATAR - NEW MODEL ===
  {
    id: 'kling-ai-avatar',
    name: 'Kling AI Avatar',
    apiId: 'kling/v1-avatar-standard', // Default to standard
    type: 'video',
    provider: 'kie_market',
    description: 'AI Avatar генерация: создавайте говорящие аватары из фото. Два режима качества: Standard (720p) и Pro (1080p).',
    rank: 9,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: false,
    pricing: {
      // NEW PRICING (credits per second):
      // standard 720p (14/sec): 5s=70⭐, 10s=140⭐, 15s=210⭐
      // pro 1080p (27/sec): 5s=135⭐, 10s=270⭐, 15s=405⭐
      '720p': { '5': 70, '10': 140, '15': 210 },
      '1080p': { '5': 135, '10': 270, '15': 405 },
    },
    modelVariants: [
      {
        id: 'kling-ai-avatar-standard',
        name: 'Kling AI Avatar Standard',
        apiId: 'kling/v1-avatar-standard',
        pricing: {
          // 720p pricing per duration
          '5': 70,
          '10': 140,
          '15': 210,
        },
      },
      {
        id: 'kling-ai-avatar-pro',
        name: 'Kling AI Avatar Pro',
        apiId: 'kling/ai-avatar-v1-pro',
        pricing: {
          // 1080p pricing per duration
          '5': 135,
          '10': 270,
          '15': 405,
        },
      },
    ],
    modes: ['i2v'], // Image to avatar video
    durationOptions: [5, 10, 15],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: 'Avatar • 5-15s',
  },

  // === KLING O1 - Video-to-Video Edit (fal.ai) ===
  {
    id: 'kling-o1-edit',
    name: 'Kling O1 Edit',
    apiId: 'fal-ai/kling-video/o1/video-to-video/edit',
    type: 'video',
    provider: 'fal',
    description: 'Kling O1 — редактирование существующих видео с помощью промпта. Поддерживает референс-изображения и элементы для замены персонажей/объектов.',
    rank: 10,
    featured: false,
    speed: 'medium',
    quality: 'high',
    supportsI2v: false,
    supportsAudio: true,
    pricing: 28,
    modes: ['v2v'],
    durationOptions: [],
    aspectRatios: [],
    shortLabel: 'V2V Edit',
  },

  // === KLING O1 - Image-to-Video First/Last Frame (fal.ai) ===
  // Документация: https://fal.ai/models/fal-ai/kling-video/o1/image-to-video
  // Цена: $0.112/сек → 5s = $0.56 (56⭐), 10s = $1.12 (112⭐)
  {
    id: 'kling-o1',
    name: 'Kling O1',
    apiId: 'fal-ai/kling-video/o1/image-to-video',
    type: 'video',
    provider: 'fal',
    description: 'First Frame → Last Frame анимация. Точный контроль перехода между двумя кадрами. Идеально для таймлапсов, морфинга, трансформаций.',
    rank: 5,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true, // Требует изображение
    supportsAudio: false,
    // Pricing: $0.112/сек → 5s = $0.56 (56⭐), 10s = $1.12 (112⭐)
    pricing: {
      '5': 56,
      '10': 112,
    },
    modes: ['i2v', 'start_end'], // Поддерживает start + end frames
    durationOptions: [5, 10],
    fixedDuration: undefined,
    aspectRatios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4'],
    shortLabel: 'First→Last • 5-10s',
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
  if (id === 'nano_banana') {
    id = 'nano-banana';
  }
  // Merge legacy per-resolution IDs into unified models
  if (id === 'flux-2-pro-2k') {
    id = 'flux-2-pro';
  }
  // flux-2-flex удалён, перенаправляем на flux-2-pro
  if (id === 'flux-2-flex' || id === 'flux-2-flex-1k' || id === 'flux-2-flex-2k') {
    id = 'flux-2-pro';
  }
  if (id === 'topaz-image-upscale-2k' || id === 'topaz-image-upscale-4k' || id === 'topaz-image-upscale-8k') {
    id = 'topaz-image-upscale';
  }
  // Merge legacy Ideogram variants into unified models
  if (id === 'ideogram-v3-a' || id === 'ideogram-v3-b' || id === 'ideogram-v3-c') {
    id = 'ideogram-v3';
  }
  if (id === 'ideogram-character-a' || id === 'ideogram-character-b' || id === 'ideogram-character-c') {
    id = 'ideogram-character';
  }
  return ALL_MODELS.find(m => m.id === id);
}

export function getFeaturedModels(type: ModelType): ModelConfig[] {
  return getModelsByType(type).filter(m => m.featured);
}

