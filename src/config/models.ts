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
  | 'basic' // Seedream 4.5
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
export type VideoMode = 't2v' | 'i2v' | 'start_end' | 'storyboard' | 'reference' | 'v2v' | 'style_transfer';
export type PhotoMode = 't2i' | 'i2i';

// === NEW TYPES FOR EXTENDED MODEL CAPABILITIES ===

// Grok Video styles
export type GrokVideoStyle = 'realistic' | 'fantasy' | 'sci-fi' | 'cinematic' | 'anime' | 'cartoon';

// Camera motion options for WAN 2.6
export type CameraMotion = 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'orbit' | 'follow';

// Style presets for WAN 2.6
export type StylePreset = 'realistic' | 'anime' | 'cinematic' | 'artistic' | 'vintage' | 'neon';

// Kling quality tiers
export type KlingQualityTier = 'standard' | 'pro' | 'master';

// KIE API Provider type
export type KieProvider = 'kie_market' | 'kie_veo' | 'openai' | 'fal' | 'laozhang' | 'genaipro';

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
  apiId2k?: string; // For LaoZhang 2K variant
  apiId4k?: string; // For LaoZhang 4K variant
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
  /**
   * Max number of input images for image-to-image / references (per API).
   * If omitted, the app assumes a conservative default (usually 1).
   */
  maxInputImages?: number;
  /**
   * Max size of ONE input image file in MB (per API).
   */
  maxInputImageSizeMb?: number;
  /**
   * Allowed input image formats (normalized lower-case extensions, e.g. "jpeg", "png", "webp").
   * Used for client/server validation.
   */
  inputImageFormats?: Array<'jpeg' | 'png' | 'webp'>;
  /**
   * Allowed output formats (per API).
   */
  outputFormats?: Array<'png' | 'jpg'>;
  
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
  // LaoZhang API variants
  apiIdFast?: string; // For fast quality variant
  apiIdLandscape?: string; // For 16:9 landscape variant
  apiIdLandscapeFast?: string; // For 16:9 fast landscape variant
  apiIdVideo2?: string; // Alternative model ID (e.g., sora_video2)
  apiId15s?: string; // For 15 second variant
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
  supportsNegativePrompt?: boolean; // Phase 2: Advanced settings

  // Extended capabilities (Phase 2)
  maxReferenceImages?: number;        // Veo: up to 3 reference images
  supportsFirstLastFrame?: boolean;   // Veo, Kling O1: start/end frame mode
  supportsStyleTransfer?: boolean;    // Grok: style transfer mode
  supportsAudioGeneration?: boolean;  // Veo, Grok: native audio generation

  // Grok Video specific
  styleOptions?: GrokVideoStyle[];

  // WAN 2.6 specific
  cameraMotionOptions?: CameraMotion[];
  stylePresets?: StylePreset[];
  motionStrengthRange?: { min: number; max: number; step: number };

  // Kling quality tiers
  qualityTiers?: KlingQualityTier[];

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

  // Phase 2: Advanced settings options
  variants?: string[]; // Model variant display names (e.g., ['Kling 2.6', 'Kling O1'])
  soundPresets?: string[]; // Sound presets for models like WAN (e.g., ['ambient', 'cinematic'])

  // Short label for sidebar (e.g., "8s • Ultra", "5/10s • Audio")
  shortLabel?: string;
  // Model tag for UI badges (e.g., "PRO", "FAST", "NEW", "ULTRA")
  modelTag?: 'PRO' | 'FAST' | 'NEW' | 'ULTRA' | 'TOP' | 'CORE';
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
    // KIE docs: https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-image
    // Allowed: 2:3, 3:2, 1:1, 9:16, 16:9
    aspectRatios: ['1:1', '3:2', '2:3', '9:16', '16:9'],
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
    apiId: 'nano-banana', // GenAIPro API model
    type: 'photo',
    provider: 'genaipro', // Using GenAIPro API
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
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Turbo/Quality',
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    apiId: 'nano-banana-pro', // GenAIPro API model
    type: 'photo',
    provider: 'genaipro', // Using GenAIPro API
    shortDescription: 'Максимум качества: детали, кожа, свет, чистые текстуры.',
    description: 'Премиальная версия для коммерции: более точные материалы, лучше мелкие детали, меньше артефактов. Выбирай, когда картинка "должна продавать".',
    rank: 2,
    featured: true,
    speed: 'fast',
    quality: 'ultra',
    supportsI2i: true,
    // KIE Nano Banana Pro capabilities snapshot (https://kie.ai/nano-banana-pro)
    maxInputImages: 8,
    maxInputImageSizeMb: 30,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    outputFormats: ['png', 'jpg'],
    pricing: {
      // NEW PRICING: 1k_2k (18 credits) = 30⭐, 4k (24 credits) = 40⭐
      '1k_2k': 30,
      '4k': 40,
    },
    qualityOptions: ['1k_2k', '4k'],
    // All aspect ratios supported by KIE API: https://kie.ai/nano-banana-pro
    aspectRatios: [
      '1:1',
      '16:9',
      '9:16',
      '4:3',
      '3:4',
      '3:2',
      '2:3',
      '4:5',
      '5:4',
      '21:9',
      // Common extra ratios ("и др.")
      '2:1',
      '1:2',
      '6:5',
      '5:6',
      '9:21',
    ],
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
    // Seedream 4.5 in this app is T2I only. Edits/references require a separate KIE "edit" model.
    supportsI2i: false,
    pricing: {
      // Keep current ⭐ pricing unchanged (even if KIE credit cost differs).
      // KIE Seedream 4.5 T2I uses quality: basic (2K) / high (4K)
      basic: 11,
      high: 11,
    },
    qualityOptions: ['basic', 'high'],
    // KIE Seedream 4.5 supports multiple aspect ratios; default is 1:1.
    // Keep in sync with src/config/kie-api-settings.ts
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9'],
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
    // KIE multi-reference (1–8), JPEG/PNG/WEBP, max 10MB each
    maxInputImages: 8,
    maxInputImageSizeMb: 10,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    pricing: {
      // Keep current ⭐ pricing unchanged.
      // KIE supports 1K/2K/4K; 4K is enabled at the same ⭐ price as 2K for now.
      '1k': 9,
      '2k': 12,
      '4k': 12,
    },
    qualityOptions: ['1k', '2k', '4k'],
    // KIE allowed: 1:1, 16:9, 9:16, 4:5, 3:4, 2:3, 3:2, auto
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '3:4', '2:3', '3:2', 'auto'],
    shortLabel: '1K/2K/4K',
  },
  // Z-image Turbo: fast photorealism + strong typography
  {
    id: 'z-image',
    name: 'Z-Image Turbo',
    // KIE model identifier for Turbo variant.
    // If KIE expects plain "z-image", we handle it in the API client fallback.
    apiId: 'z-image-turbo',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Фотореализм и чистые текстуры • сильная типографика.',
    description: 'Z-Image Turbo — быстрый фотореализм с чистым светом и текстурами. Хорошо рисует мелкий текст (EN/中文), постеры и баннеры. Поддерживает 1 референс (до 10 МБ).',
    rank: 14,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    maxInputImages: 1,
    maxInputImageSizeMb: 10,
    inputImageFormats: ['jpeg', 'png', 'webp'],
    pricing: {
      // NEW PRICING: 0.8 credit = 2⭐
      turbo: 2,
      balanced: 2,
      quality: 2,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    // Allowed: 1:1, 4:3, 3:4, 16:9, 9:16 (+ auto when a reference image is provided)
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', 'auto'],
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
    featured: true,
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
    name: 'Topaz Upscale',
    apiId: 'topaz/image-upscale',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Апскейл до 8K • Улучшение качества',
    description: 'Профессиональный апскейл изображений до 8K разрешения. Улучшает детали, резкость и качество для печати, баннеров и крупных форматов.',
    rank: 2,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      // Topaz Upscale (KIE): upscale_factor "2" | "4" | "8"
      // Use quality labels as "2k"/"4k"/"8k" in pricing/UI
      '2k': 17,
      '4k': 34,
      '8k': 68,
    },
    qualityOptions: ['2k', '4k', '8k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '2K/4K/8K',
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

// ===== VIDEO MODELS =====
// Unified Video Generator: 8 models
// Providers: Google (Veo), Kling (via Kie.ai), xAI (Grok), OpenAI (Sora), WAN
// Motion Control moved to separate section

export const VIDEO_MODELS: VideoModelConfig[] = [
  // === 1. VEO 3.1 FAST - Google via GenAIPro ===
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 Fast',
    apiId: 'veo-3.1-fast',
    type: 'video',
    provider: 'genaipro', // Using GenAIPro API
    description: 'Veo 3.1 Fast от Google — быстрая генерация видео высокого качества. Поддерживает text-to-video, image-to-video, до 3 референс-изображений, start/end frames.',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: false,
    supportsStartEnd: false,
    supportsFirstLastFrame: true,
    maxReferenceImages: 3,
    pricing: {
      '4': 50,
      '6': 75,
      '8': 99,
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [4, 6, 8],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '4-8s • Fast • 3 Refs',
    modelTag: 'FAST',
  },

  // === 2. KLING 2.1 - Kie.ai ===
  {
    id: 'kling-2.1',
    name: 'Kling 2.1',
    apiId: 'kling-2.1/text-to-video',
    apiIdI2v: 'kling-2.1/image-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'Kling 2.1 Master — высокое качество генерации видео. Text-to-video, image-to-video, start/end frames.',
    rank: 2,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: false,
    supportsFirstLastFrame: true,
    pricing: {
      '5': 200,
      '10': 400,
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: '5-10s • Master',
    modelTag: 'ULTRA',
  },

  // === 3. KLING 2.5 - Kie.ai ===
  {
    id: 'kling-2.5',
    name: 'Kling 2.5',
    apiId: 'kling-2.5-turbo/text-to-video',
    apiIdI2v: 'kling-2.5-turbo/image-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'Kling 2.5 Turbo — быстрая генерация с хорошим балансом скорости и качества. Поддержка start/end frames.',
    rank: 3,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: false,
    supportsFirstLastFrame: true,
    pricing: {
      '5': 105,
      '10': 210,
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: '5-10s • Turbo',
    modelTag: 'FAST',
  },

  // === 4. KLING 2.6 - Kie.ai ===
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    apiId: 'kling-2.6/text-to-video',
    apiIdI2v: 'kling-2.6/image-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'Kling 2.6 Standard — отличная динамика и стабильность. Поддерживает генерацию звука и start/end frames.',
    rank: 4,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: true,
    supportsAudioGeneration: true,
    supportsFirstLastFrame: true,
    pricing: {
      '5': { no_audio: 105, audio: 135 },
      '10': { no_audio: 210, audio: 270 },
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: '5-10s • Audio',
    modelTag: 'CORE',
  },

  // === 5. KLING 2.6 MOTION CONTROL - Separate Section ===
  {
    id: 'kling-motion-control',
    name: 'Kling Motion Control',
    apiId: 'kling-2.6-motion-control',
    type: 'video',
    provider: 'kie_market',
    description: 'Kling 2.6 Motion Control — передача движения из референсного видео на персонажа.',
    rank: 5,
    featured: false, // Motion Control в отдельном разделе
    speed: 'medium',
    quality: 'high',
    supportsI2v: false,
    supportsAudio: false,
    pricing: {
      '720p': { per_second: 16 },
      '1080p': { per_second: 25 },
    },
    modes: ['v2v'], // video-to-video only
    durationOptions: [], // Based on input video length (3-30s)
    resolutionOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: 'Motion Transfer',
    modelTag: 'CORE',
  },

  // === 6. GROK VIDEO - xAI ===
  {
    id: 'grok-video',
    name: 'Grok Video',
    apiId: 'grok-imagine/text-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'Grok Video от xAI — создаёт видео с синхронизированным звуком. Поддерживает style transfer, start/end frames. 6 стилей на выбор.',
    rank: 6,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: true,
    supportsStartEnd: false,
    supportsFirstLastFrame: false, // Grok uses simple I2V, not start/end frames
    supportsStyleTransfer: true,
    supportsAudioGeneration: true,
    styleOptions: ['realistic', 'fantasy', 'sci-fi', 'cinematic', 'anime', 'cartoon'],
    pricing: {
      '6': 25,
      '12': 45,
      '18': 65,
      '24': 85,
      '30': 105,
    },
    modes: ['t2v', 'i2v', 'style_transfer'],
    durationOptions: [6, 12, 18, 24, 30],
    aspectRatios: ['9:16', '1:1', '3:2', '2:3'],
    shortLabel: '6-30s • Audio • Styles',
    modelTag: 'NEW',
  },

  // === 7. SORA 2 - OpenAI via LaoZhang ===
  {
    id: 'sora-2',
    name: 'Sora 2',
    apiId: 'sora-2', // LaoZhang API model ID
    type: 'video',
    provider: 'laozhang', // Uses LaoZhang API
    description: 'OpenAI Sora 2 через LaoZhang — универсальная генерация с балансом качества и скорости. Text-to-video, image-to-video.',
    rank: 7,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2v: true,
    supportsAudio: false,
    pricing: {
      '10': 250,
      '15': 450,
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [10, 15],
    aspectRatios: ['portrait', 'landscape'],
    shortLabel: '10-15s • T2V/I2V',
    modelTag: 'PRO',
  },

  // === 8. WAN 2.6 ===
  {
    id: 'wan-2.6',
    name: 'WAN 2.6',
    apiId: 'wan-2.6/text-to-video',
    apiIdI2v: 'wan-2.6/image-to-video',
    apiIdV2v: 'wan-2.6/video-to-video',
    type: 'video',
    provider: 'kie_market',
    description: 'WAN 2.6 — кинематографическая генерация с управлением камерой и стилем. Поддерживает video-to-video.',
    rank: 8,
    featured: true,
    speed: 'slow',
    quality: 'ultra',
    supportsI2v: true,
    supportsAudio: false,
    cameraMotionOptions: ['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'orbit', 'follow'],
    styleOptions: ['realistic', 'cinematic', 'anime', 'cartoon'],
    pricing: {
      '5': 120,
      '10': 240,
      '15': 360,
    },
    modes: ['t2v', 'i2v', 'v2v'],
    durationOptions: [5, 10, 15],
    resolutionOptions: ['720p', '1080p', '1080p_multi'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    shortLabel: '5-15s • Camera • V2V',
    modelTag: 'ULTRA',
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
  // veo-3.1-fast is the actual model ID, no alias needed
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
