// ============================================
// PHOTO MODELS - DEFINITIVE PRICING
// Based on Kie.ai credits (1⭐ = 1 credit = $0.005 = 0.45₽)
// ============================================

export interface ModelConfig {
  id: string;
  name: string;
  type: 'image' | 'video';
  credits: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  description: string;
  features: string[];
  maxImages?: number;
  aspectRatios: string[];
  recommendedFor: string[];
}

export const PHOTO_MODELS: ModelConfig[] = [
  // Z-IMAGE (0.8 → 1⭐)
  {
    id: 'z-image',
    name: 'Z-Image',
    type: 'image',
    credits: 1,
    speed: 'fast',
    quality: 'standard',
    description: 'Самая доступная генерация для тестов',
    features: ['text-to-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16'],
    recommendedFor: ['Тесты', 'Эксперименты', 'Быстрые итерации'],
  },

  // IMAGEN 4 FAST (4⭐)
  {
    id: 'imagen-4-fast',
    name: 'Imagen 4 Fast',
    type: 'image',
    credits: 4,
    speed: 'fast',
    quality: 'high',
    description: 'Google AI — быстрое качество',
    features: ['text-to-image', 'aspect-ratio', 'negative-prompt'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    recommendedFor: ['Скорость', 'Качество', 'Реализм'],
  },

  // SEEDREAM 4.5 (6.5 → 7⭐)
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    type: 'image',
    credits: 7,
    speed: 'medium',
    quality: 'ultra',
    description: 'Самый "рекламный" фотореал',
    features: ['text-to-image', 'image-to-image', 'aspect-ratio', 'negative-prompt', 'seed-control'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    recommendedFor: ['Реклама', 'E-commerce', 'Wildberries/Ozon'],
  },

  // FLUX.2 PRO - 1K (5⭐)
  {
    id: 'flux-2-1k',
    name: 'FLUX.2 Pro (1K)',
    type: 'image',
    credits: 5,
    speed: 'medium',
    quality: 'ultra',
    description: 'Топ по фактурам — 1024px',
    features: ['text-to-image', 'image-to-image', 'style-reference', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5'],
    recommendedFor: ['Предметка', 'Текстуры', 'Материалы'],
  },

  // FLUX.2 PRO - 2K (7⭐)
  {
    id: 'flux-2-2k',
    name: 'FLUX.2 Pro (2K)',
    type: 'image',
    credits: 7,
    speed: 'medium',
    quality: 'ultra',
    description: 'FLUX.2 в 2048px',
    features: ['text-to-image', 'image-to-image', 'style-reference', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5'],
    recommendedFor: ['Печать', 'Детализация', 'Premium'],
  },

  // NANO BANANA PRO - 2K (18⭐)
  {
    id: 'nano-banana-pro-2k',
    name: 'Nano Banana Pro (2K)',
    type: 'image',
    credits: 18,
    speed: 'fast',
    quality: 'high',
    description: 'Стабильные персонажи в 2K',
    features: ['text-to-image', 'character-reference', 'aspect-ratio', 'seed-control'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16'],
    recommendedFor: ['Персонажи', 'Контент-завод', 'Стабильность'],
  },

  // NANO BANANA PRO - 4K (24⭐)
  {
    id: 'nano-banana-pro-4k',
    name: 'Nano Banana Pro (4K)',
    type: 'image',
    credits: 24,
    speed: 'medium',
    quality: 'ultra',
    description: 'Максимум 4K для печати',
    features: ['text-to-image', 'character-reference', 'aspect-ratio', 'seed-control'],
    maxImages: 2,
    aspectRatios: ['1:1', '16:9', '9:16'],
    recommendedFor: ['Печать', '4K качество', 'Premium'],
  },

  // IDEOGRAM V3 - TURBO (3.5 → 4⭐)
  {
    id: 'ideogram-v3-turbo',
    name: 'Ideogram V3 (Turbo)',
    type: 'image',
    credits: 4,
    speed: 'fast',
    quality: 'standard',
    description: 'Быстро + текст в картинке',
    features: ['text-to-image', 'text-in-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '5:4'],
    recommendedFor: ['Постеры', 'Баннеры', 'Текст'],
  },

  // IDEOGRAM V3 - BALANCED (7⭐)
  {
    id: 'ideogram-v3-balanced',
    name: 'Ideogram V3 (Balanced)',
    type: 'image',
    credits: 7,
    speed: 'medium',
    quality: 'high',
    description: 'Баланс скорости и качества текста',
    features: ['text-to-image', 'text-in-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '5:4'],
    recommendedFor: ['Дизайн', 'Текст', 'Баланс'],
  },

  // IDEOGRAM V3 - QUALITY (10⭐)
  {
    id: 'ideogram-v3-quality',
    name: 'Ideogram V3 (Quality)',
    type: 'image',
    credits: 10,
    speed: 'slow',
    quality: 'ultra',
    description: 'Максимум качества текста',
    features: ['text-to-image', 'text-in-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '4:5', '5:4'],
    recommendedFor: ['Premium постеры', 'Профи дизайн'],
  },

  // QWEN - 1024×1024 (5⭐)
  {
    id: 'qwen-1024',
    name: 'Qwen (1024×1024)',
    type: 'image',
    credits: 5,
    speed: 'fast',
    quality: 'standard',
    description: 'RU промпты, базовое разрешение',
    features: ['text-to-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1'],
    recommendedFor: ['RU промпты', 'Быстро'],
  },

  // QWEN - 1536×1024 (7⭐)
  {
    id: 'qwen-1536x1024',
    name: 'Qwen (1536×1024)',
    type: 'image',
    credits: 7,
    speed: 'medium',
    quality: 'high',
    description: 'RU промпты, широкий формат',
    features: ['text-to-image', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['3:2', '2:3'],
    recommendedFor: ['Широкие форматы', 'RU промпты'],
  },

  // QWEN - 2048×2048 (17⭐)
  {
    id: 'qwen-2048',
    name: 'Qwen (2048×2048)',
    type: 'image',
    credits: 17,
    speed: 'slow',
    quality: 'ultra',
    description: 'RU промпты, максимум качества',
    features: ['text-to-image', 'aspect-ratio'],
    maxImages: 2,
    aspectRatios: ['1:1'],
    recommendedFor: ['Высокое разрешение', 'RU промпты'],
  },

  // MIDJOURNEY (15⭐ — временно)
  {
    id: 'midjourney',
    name: 'Midjourney',
    type: 'image',
    credits: 15,
    speed: 'medium',
    quality: 'ultra',
    description: 'Премиум стиль и арт',
    features: ['text-to-image', 'style-reference', 'aspect-ratio'],
    maxImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '2:3', '3:2'],
    recommendedFor: ['Арт', 'Креатив', 'Стилизация'],
  },
];

// ============================================
// VIDEO MODELS - DEFINITIVE PRICING
// ============================================

export const VIDEO_MODELS: ModelConfig[] = [
  // SORA 2 - 5s (15⭐)
  {
    id: 'sora-2-5s',
    name: 'Sora 2 (5s)',
    type: 'video',
    credits: 15,
    speed: 'fast',
    quality: 'standard',
    description: 'Базовая Sora, 5 сек, 720p',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Универсал', 'Тесты', 'Быстро'],
  },

  // SORA 2 - 10s (30⭐)
  {
    id: 'sora-2-10s',
    name: 'Sora 2 (10s)',
    type: 'video',
    credits: 30,
    speed: 'medium',
    quality: 'standard',
    description: 'Базовая Sora, 10 сек, 720p',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Универсал', 'Средняя длина'],
  },

  // SORA 2 - 15s (45⭐)
  {
    id: 'sora-2-15s',
    name: 'Sora 2 (15s)',
    type: 'video',
    credits: 45,
    speed: 'medium',
    quality: 'standard',
    description: 'Базовая Sora, 15 сек, 720p',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Универсал', 'Длинные ролики'],
  },

  // SEEDANCE PRO 720p - 5s (30⭐)
  {
    id: 'seedance-pro-720p-5s',
    name: 'Seedance Pro (720p, 5s)',
    type: 'video',
    credits: 30,
    speed: 'fast',
    quality: 'standard',
    description: 'Контент-завод, 720p, 5 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Контент-завод', 'Тесты', 'Скорость'],
  },

  // SEEDANCE PRO 720p - 10s (60⭐)
  {
    id: 'seedance-pro-720p-10s',
    name: 'Seedance Pro (720p, 10s)',
    type: 'video',
    credits: 60,
    speed: 'fast',
    quality: 'standard',
    description: 'Контент-завод, 720p, 10 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Контент-завод', 'Средние ролики'],
  },

  // SEEDANCE PRO 720p - 15s (90⭐)
  {
    id: 'seedance-pro-720p-15s',
    name: 'Seedance Pro (720p, 15s)',
    type: 'video',
    credits: 90,
    speed: 'medium',
    quality: 'standard',
    description: 'Контент-завод, 720p, 15 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Контент-завод', 'Длинные ролики'],
  },

  // SEEDANCE PRO 1080p - 5s (70⭐)
  {
    id: 'seedance-pro-1080p-5s',
    name: 'Seedance Pro (1080p, 5s)',
    type: 'video',
    credits: 70,
    speed: 'medium',
    quality: 'high',
    description: 'HD качество, 1080p, 5 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['HD качество', 'Короткие ролики'],
  },

  // SEEDANCE PRO 1080p - 10s (140⭐)
  {
    id: 'seedance-pro-1080p-10s',
    name: 'Seedance Pro (1080p, 10s)',
    type: 'video',
    credits: 140,
    speed: 'medium',
    quality: 'high',
    description: 'HD качество, 1080p, 10 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['HD качество', 'Средние ролики'],
  },

  // SEEDANCE PRO 1080p - 15s (210⭐)
  {
    id: 'seedance-pro-1080p-15s',
    name: 'Seedance Pro (1080p, 15s)',
    type: 'video',
    credits: 210,
    speed: 'slow',
    quality: 'high',
    description: 'HD качество, 1080p, 15 сек',
    features: ['text-to-video', 'image-to-video', 'aspect-ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['HD качество', 'Длинные ролики'],
  },

  // KLING 2.6 - 5s no audio (55⭐)
  {
    id: 'kling-2.6-5s',
    name: 'Kling 2.6 (5s)',
    type: 'video',
    credits: 55,
    speed: 'medium',
    quality: 'ultra',
    description: 'Динамика, 5 сек HD',
    features: ['text-to-video', 'image-to-video', 'motion-brush', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Динамика', 'Спецэффекты'],
  },

  // KLING 2.6 - 10s no audio (110⭐)
  {
    id: 'kling-2.6-10s',
    name: 'Kling 2.6 (10s)',
    type: 'video',
    credits: 110,
    speed: 'medium',
    quality: 'ultra',
    description: 'Динамика, 10 сек HD',
    features: ['text-to-video', 'image-to-video', 'motion-brush', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Динамика', 'Длинные сцены'],
  },

  // KLING 2.6 - 5s WITH audio (110⭐)
  {
    id: 'kling-2.6-5s-audio',
    name: 'Kling 2.6 (5s + Audio)',
    type: 'video',
    credits: 110,
    speed: 'medium',
    quality: 'ultra',
    description: 'Динамика с аудио, 5 сек',
    features: ['text-to-video', 'image-to-video', 'audio-sync', 'motion-brush'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Аудио', 'Динамика', 'Реклама'],
  },

  // KLING 2.6 - 10s WITH audio (220⭐)
  {
    id: 'kling-2.6-10s-audio',
    name: 'Kling 2.6 (10s + Audio)',
    type: 'video',
    credits: 220,
    speed: 'slow',
    quality: 'ultra',
    description: 'Динамика с аудио, 10 сек',
    features: ['text-to-video', 'image-to-video', 'audio-sync', 'motion-brush'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Аудио', 'Длинные сцены'],
  },

  // VEO 3.1 FAST (80⭐)
  {
    id: 'veo-3.1-fast-8s-audio',
    name: 'Veo 3.1 Fast (8s + Audio)',
    type: 'video',
    credits: 80,
    speed: 'fast',
    quality: 'ultra',
    description: 'Премиум кинореал с аудио, 8 сек',
    features: ['text-to-video', 'image-to-video', 'audio-sync', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Реклама', 'Premium', 'Аудио'],
  },

  // VEO 3.1 QUALITY (400⭐)
  {
    id: 'veo-3.1-quality-8s-audio',
    name: 'Veo 3.1 Quality (8s + Audio)',
    type: 'video',
    credits: 400,
    speed: 'slow',
    quality: 'ultra',
    description: 'Максимум качества с аудио, 8 сек',
    features: ['text-to-video', 'image-to-video', 'audio-sync', 'first-last-frame'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Кино', 'Premium реклама', 'Топ'],
  },

  // SORA 2 PRO STANDARD - 10s (150⭐)
  {
    id: 'sora-2-pro-10s',
    name: 'Sora 2 Pro (10s, 720p)',
    type: 'video',
    credits: 150,
    speed: 'slow',
    quality: 'ultra',
    description: 'Премиум Sora, 10 сек, 720p',
    features: ['text-to-video', 'image-to-video', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Кино', 'Premium'],
  },

  // SORA 2 PRO STANDARD - 15s (270⭐)
  {
    id: 'sora-2-pro-15s',
    name: 'Sora 2 Pro (15s, 720p)',
    type: 'video',
    credits: 270,
    speed: 'slow',
    quality: 'ultra',
    description: 'Премиум Sora, 15 сек, 720p',
    features: ['text-to-video', 'image-to-video', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Кино', 'Длинные сцены'],
  },

  // SORA 2 PRO HIGH - 10s (330⭐)
  {
    id: 'sora-2-pro-1080-10s',
    name: 'Sora 2 Pro (10s, 1080p)',
    type: 'video',
    credits: 330,
    speed: 'slow',
    quality: 'ultra',
    description: 'Топовое качество, 10 сек, 1080p',
    features: ['text-to-video', 'image-to-video', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Максимум качества', 'Кино'],
  },

  // SORA 2 PRO HIGH - 15s (630⭐)
  {
    id: 'sora-2-pro-1080-15s',
    name: 'Sora 2 Pro (15s, 1080p)',
    type: 'video',
    credits: 630,
    speed: 'slow',
    quality: 'ultra',
    description: 'Топовое качество, 15 сек, 1080p',
    features: ['text-to-video', 'image-to-video', 'camera-control'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    recommendedFor: ['Максимум качества', 'Длинные'],
  },

  // SORA 2 STORYBOARD - 10s (150⭐)
  {
    id: 'sora-2-storyboard-10s',
    name: 'Sora 2 Storyboard (10s)',
    type: 'video',
    credits: 150,
    speed: 'slow',
    quality: 'high',
    description: 'Раскадровка, 10 сек',
    features: ['storyboard', 'text-to-video', 'multiple-subjects'],
    aspectRatios: ['16:9', '9:16'],
    recommendedFor: ['Сторителлинг', 'Раскадровка'],
  },

  // SORA 2 STORYBOARD - 15-25s (270⭐)
  {
    id: 'sora-2-storyboard-15-25s',
    name: 'Sora 2 Storyboard (15–25s)',
    type: 'video',
    credits: 270,
    speed: 'slow',
    quality: 'high',
    description: 'Раскадровка, 15-25 сек',
    features: ['storyboard', 'text-to-video', 'multiple-subjects'],
    aspectRatios: ['16:9', '9:16'],
    recommendedFor: ['Длинный сторителлинг', 'Реклама'],
  },
];

// Helper functions
export function getModelById(id: string): ModelConfig | undefined {
  return [...PHOTO_MODELS, ...VIDEO_MODELS].find(m => m.id === id);
}

export function getModelFeatures(id: string): string[] {
  return getModelById(id)?.features || [];
}

export function hasFeature(modelId: string, feature: string): boolean {
  return getModelFeatures(modelId).includes(feature);
}
