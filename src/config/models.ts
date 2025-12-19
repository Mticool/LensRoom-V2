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
    shortDescription: 'Фотореализм и "вкусная" картинка за секунды.',
    description: 'Лучший универсал на каждый день: стабильный реализм, хорошие лица, одежда, предметка. Подходит для быстрых тестов идей и массового контента.',
    rank: 1,
    featured: true,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      turbo: 6,
      balanced: 6,
      quality: 6,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Turbo/Quality',
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    apiId: 'google/nano-banana-pro',
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
      turbo: 35,
      balanced: 35,
      quality: 35,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Pro',
  },
  {
    id: 'imagen-4',
    name: 'Imagen 4 Fast',
    apiId: 'google/imagen4',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Чисто, аккуратно, быстро. Минимум артефактов.',
    description: 'Стабильная генерация с понятным результатом: хороший свет, адекватные формы, ровные сцены. Отлично для "нормального результата без сюрпризов".',
    rank: 3,
    featured: true,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: false,
    pricing: {
      turbo: 6,
      balanced: 6,
      quality: 6,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Brand',
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
      turbo: 10,
      balanced: 10,
      quality: 10,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
    shortLabel: 'Turbo/Quality',
  },
  {
    id: 'seedream-v4',
    name: 'Seedream V4',
    apiId: 'bytedance/seedream',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Яркий стиль и современная картинка "как в трендах".',
    description: 'Модель с сильной стилизацией и "вау-цветом". Хорошо подходит для креативов, постеров, иллюстраций и соцсетей.',
    rank: 8,
    featured: true,
    speed: 'medium',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      turbo: 8,
      balanced: 8,
      quality: 8,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'V4',
  },
  {
    id: 'flux-2-pro',
    name: 'FLUX.2 Pro',
    apiId: 'flux-2/pro-text-to-image', // Correct API ID - WORKING!
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
      '1k': 10,
      '2k': 12,
    },
    qualityOptions: ['1k', '2k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '1K/2K',
  },
  {
    id: 'flux-2-flex',
    name: 'FLUX.2 Flex',
    apiId: 'flux-2/flex-text-to-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'FLUX.2 Flex — гибкая стилизация/контроль.',
    description: 'FLUX.2 Flex — гибкая стилизация/контроль. Выбор 1K/2K.',
    rank: 15,
    featured: false,
    speed: 'medium',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      '1k': 20,
      '2k': 35,
    },
    qualityOptions: ['1k', '2k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '1K/2K',
  },
  {
    id: 'flux-kontext-pro',
    name: 'Flux Kontext Pro',
    apiId: 'flux-kontext-pro',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Лучший выбор для правок и точного попадания в идею.',
    description: 'Сильная модель для контроля результата: хорошо держит структуру, композицию и смысл. Идеально, когда важна предсказуемость.',
    rank: 4,
    featured: false,
    speed: 'medium',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      turbo: 8,
      balanced: 8,
      quality: 8,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Kontext',
  },
  {
    id: 'flux-kontext-max',
    name: 'Flux Kontext Max',
    apiId: 'flux-kontext-max',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Максимальный контроль и качество при сложных сценах.',
    description: 'Версия "для сложного": больше стабильности на деталях и композиции, лучше работает с точными запросами и вариациями одной идеи.',
    rank: 5,
    featured: false,
    speed: 'slow',
    quality: 'ultra',
    supportsI2i: true,
    pricing: {
      turbo: 15,
      balanced: 15,
      quality: 15,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: 'Max',
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
      turbo: 3,
      balanced: 3,
      quality: 3,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    shortLabel: '2-3⭐',
  },
  {
    id: 'qwen-text-to-image',
    name: 'Qwen Text-to-Image',
    apiId: 'qwen/text-to-image',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Бюджетно и быстро — для черновиков и тестов.',
    description: 'Оптимально для быстрых итераций: накидать идеи, проверить композицию, собрать варианты. Если понравилось — финаль на Banana/FLUX/Imagen.',
    rank: 10,
    featured: false,
    speed: 'fast',
    quality: 'high',
    supportsI2i: false,
    pricing: {
      turbo: 4,
      balanced: 4,
      quality: 4,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Qwen',
  },
  // Qwen Image Edit: requires image_url (i2i only)
  {
    id: 'qwen-image',
    name: 'Qwen Image Edit',
    apiId: 'qwen/image-edit',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Правки по изображению: заменить, исправить, улучшить.',
    description: 'Редактор для быстрых правок: изменить детали, подчистить, заменить объекты, улучшить кадр. Удобно, когда "почти идеально, но надо поправить".',
    rank: 11,
    featured: false,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      turbo: 6,
      balanced: 6,
      quality: 6,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Edit',
  },
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
      turbo: 7,
      balanced: 14,
      quality: 19,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'V3',
  },
  {
    id: 'ideogram-character',
    name: 'Ideogram Character',
    apiId: 'ideogram/character',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Ideogram Character — пакеты по credits.',
    description: 'Ideogram Character — пакеты по credits (выберите нужный пакет).',
    rank: 16,
    featured: false,
    speed: 'slow',
    quality: 'ultra',
    supportsI2i: false,
    pricing: {
      a_12cred: 15,
      a_18cred: 25,
      a_24cred: 35,
      b_36cred: 60,
      b_45cred: 75,
      b_54cred: 90,
      c_48cred: 80,
      c_60cred: 100,
      c_72cred: 120,
    },
    qualityOptions: ['a_12cred', 'a_18cred', 'a_24cred', 'b_36cred', 'b_45cred', 'b_54cred', 'c_48cred', 'c_60cred', 'c_72cred'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Character',
  },
  {
    id: 'recraft-crisp-upscale',
    name: 'Recraft Crisp Upscale',
    apiId: 'recraft/crisp-upscale',
    type: 'photo',
    provider: 'kie_market',
    shortDescription: 'Апскейл изображения (Recraft Crisp).',
    description: 'Апскейл изображения (Recraft Crisp). Требует входное изображение.',
    rank: 17,
    featured: false,
    speed: 'fast',
    quality: 'high',
    supportsI2i: true,
    pricing: {
      turbo: 3,
      balanced: 3,
      quality: 3,
    },
    qualityOptions: ['turbo', 'balanced', 'quality'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: 'Upscale',
  },
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
      turbo: 3,
      balanced: 3,
      quality: 3,
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
      '2k': 20,
      '4k': 35,
      '8k': 75,
    },
    qualityOptions: ['2k', '4k', '8k'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
    shortLabel: '≤2K/4K/8K',
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
      quality: { '8': 450 },
      fast: { '8': 110 },
    },
    modes: ['t2v', 'i2v'],
    durationOptions: [8],
    // Default to fast (per UX requirement); can be switched to quality in UI.
    qualityOptions: ['fast', 'quality'],
    // Veo rejects 1:1 with "Ratio error" (422) — keep only supported ratios.
    aspectRatios: ['16:9', '9:16'],
    shortLabel: '8s • Fast',
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
      '5': { no_audio: 80, audio: 160 },
      '10': { no_audio: 160, audio: 320 },
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
    aspectRatios: ['portrait', 'landscape'],
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
      'standard': { '10': 220, '15': 400 },
      'high': { '10': 500, '15': 940 },
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
        '10': 220,
        '15-25': 400,
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
  if (id === 'nano_banana') {
    id = 'nano-banana';
  }
  // Merge legacy per-resolution IDs into unified models
  if (id === 'flux-2-pro-2k') {
    id = 'flux-2-pro';
  }
  if (id === 'flux-2-flex-1k' || id === 'flux-2-flex-2k') {
    id = 'flux-2-flex';
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


