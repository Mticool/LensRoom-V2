// ===== VIDEO GENERATOR REGISTRY =====
// Config-driven video model definitions with variants and costs

export type VideoModeId = 't2v' | 'i2v' | 'start_end' | 'storyboard';

export interface VideoVariant {
  id: string;
  duration: number | string; // number for fixed, string like "15-25" for range
  quality?: '720p' | '1080p' | 'fast' | 'quality';
  audio?: boolean;
  starsCost: number;
}

export interface VideoModelConfig {
  id: string;
  name: string;
  short: string; // Short description for sidebar
  featured: boolean;
  modes: VideoModeId[];
  durationOptions: (number | string)[]; // Available durations
  qualityOptions?: ('720p' | '1080p' | 'fast' | 'quality')[];
  supportsAudio?: boolean;
  fixedDuration?: number; // If duration is fixed (e.g., Veo = 8s)
  variants: VideoVariant[];
  aspectRatios: string[];
}

// ===== MODEL DEFINITIONS =====

export const VIDEO_GENERATOR_MODELS: VideoModelConfig[] = [
  // VEO 3.1 - Premium with start_end support
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    short: 'Премиум + звук • 8с',
    featured: true,
    modes: ['t2v', 'i2v', 'start_end'],
    durationOptions: [8],
    qualityOptions: ['fast', 'quality'],
    fixedDuration: 8,
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'veo-3.1-fast-8s-audio', duration: 8, quality: 'fast', audio: true, starsCost: 80 },
      { id: 'veo-3.1-quality-8s-audio', duration: 8, quality: 'quality', audio: true, starsCost: 400 },
    ],
  },

  // KLING 2.6 - Universal with audio option
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    short: 'Динамика • 5-10с',
    featured: true,
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10],
    supportsAudio: true,
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'kling-2.6-5s', duration: 5, audio: false, starsCost: 55 },
      { id: 'kling-2.6-10s', duration: 10, audio: false, starsCost: 110 },
      { id: 'kling-2.6-5s-audio', duration: 5, audio: true, starsCost: 110 },
      { id: 'kling-2.6-10s-audio', duration: 10, audio: true, starsCost: 220 },
    ],
  },

  // SEEDANCE PRO - Content factory
  {
    id: 'seedance-pro',
    name: 'Seedance Pro',
    short: 'Контент-завод • 5-15с',
    featured: true,
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10, 15],
    qualityOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'seedance-720p-5s', duration: 5, quality: '720p', starsCost: 30 },
      { id: 'seedance-720p-10s', duration: 10, quality: '720p', starsCost: 60 },
      { id: 'seedance-720p-15s', duration: 15, quality: '720p', starsCost: 90 },
      { id: 'seedance-1080p-5s', duration: 5, quality: '1080p', starsCost: 70 },
      { id: 'seedance-1080p-10s', duration: 10, quality: '1080p', starsCost: 140 },
      { id: 'seedance-1080p-15s', duration: 15, quality: '1080p', starsCost: 210 },
    ],
  },

  // SORA 2 - Universal budget option
  {
    id: 'sora-2',
    name: 'Sora 2',
    short: 'Универсал • 5-15с',
    featured: false,
    modes: ['t2v', 'i2v'],
    durationOptions: [5, 10, 15],
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'sora-2-5s', duration: 5, starsCost: 15 },
      { id: 'sora-2-10s', duration: 10, starsCost: 30 },
      { id: 'sora-2-15s', duration: 15, starsCost: 45 },
    ],
  },

  // SORA 2 PRO - Premium quality
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    short: 'Кино-качество • 10-15с',
    featured: true,
    modes: ['t2v', 'i2v'],
    durationOptions: [10, 15],
    qualityOptions: ['720p', '1080p'],
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'sora-2-pro-720p-10s', duration: 10, quality: '720p', starsCost: 150 },
      { id: 'sora-2-pro-720p-15s', duration: 15, quality: '720p', starsCost: 270 },
      { id: 'sora-2-pro-1080p-10s', duration: 10, quality: '1080p', starsCost: 330 },
      { id: 'sora-2-pro-1080p-15s', duration: 15, quality: '1080p', starsCost: 630 },
    ],
  },

  // STORYBOARD - Multi-scene
  {
    id: 'sora-storyboard',
    name: 'Sora Storyboard',
    short: 'Раскадровка • 10-25с',
    featured: false,
    modes: ['storyboard'],
    durationOptions: [10, '15-25'],
    aspectRatios: ['16:9', '9:16'],
    variants: [
      { id: 'sora-storyboard-10s', duration: 10, starsCost: 150 },
      { id: 'sora-storyboard-15-25s', duration: '15-25', starsCost: 270 },
    ],
  },
];

// ===== HELPER FUNCTIONS =====

export function getFeaturedVideoModels(): VideoModelConfig[] {
  return VIDEO_GENERATOR_MODELS.filter(m => m.featured);
}

export function getAllVideoModels(): VideoModelConfig[] {
  return VIDEO_GENERATOR_MODELS;
}

export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return VIDEO_GENERATOR_MODELS.find(m => m.id === id);
}

export function modelSupportsMode(model: VideoModelConfig, mode: VideoModeId): boolean {
  return model.modes.includes(mode);
}

export function getAvailableModes(model: VideoModelConfig): VideoModeId[] {
  return model.modes;
}

// Get variant based on UI state
export function getVariantFromUIState(
  modelId: string,
  duration: number | string,
  quality?: '720p' | '1080p' | 'fast' | 'quality',
  audio?: boolean
): { variant: VideoVariant | null; starsCost: number } {
  const model = getVideoModelById(modelId);
  if (!model) return { variant: null, starsCost: 0 };

  // Find matching variant
  const variant = model.variants.find(v => {
    const durationMatch = v.duration === duration;
    const qualityMatch = !model.qualityOptions || v.quality === quality;
    const audioMatch = !model.supportsAudio || v.audio === audio;
    return durationMatch && qualityMatch && audioMatch;
  });

  if (variant) {
    return { variant, starsCost: variant.starsCost };
  }

  // Fallback to first variant
  return { variant: model.variants[0], starsCost: model.variants[0]?.starsCost || 0 };
}

// Get minimum cost for model (for sidebar display)
export function getMinCost(model: VideoModelConfig): number {
  return Math.min(...model.variants.map(v => v.starsCost));
}

// Mode labels
export const MODE_LABELS: Record<VideoModeId, string> = {
  t2v: 'Текст → Видео',
  i2v: 'Фото → Видео',
  start_end: 'Старт + Финиш',
  storyboard: 'Раскадровка',
};

export const MODE_DESCRIPTIONS: Record<VideoModeId, string> = {
  t2v: 'Создайте видео из текстового описания',
  i2v: 'Анимируйте статичное изображение',
  start_end: 'AI создаст плавный переход между двумя кадрами',
  storyboard: 'Соберите видео из нескольких сцен',
};

