// Models config for homepage display
// Simplified model definitions for marketing purposes

export interface DisplayModel {
  id: string;
  name: string;
  credits: number | null;
  description: string;
  quality: 'standard' | 'high' | 'ultra';
  speed: 'fast' | 'medium' | 'slow';
  featured?: boolean;
}

export const PHOTO_MODELS: DisplayModel[] = [
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    credits: 5,
    description: 'Самый «рекламный» фотореал, хорошо держит композицию.',
    quality: 'ultra',
    speed: 'medium',
    featured: true,
  },
  {
    id: 'flux-2',
    name: 'FLUX.2',
    credits: 8,
    description: 'Топ по фактурам/материалам (предметка, упаковка, ткань, металл).',
    quality: 'ultra',
    speed: 'medium',
    featured: true,
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    credits: 3,
    description: 'Лучший баланс цена/скорость/качество + стабильные персонажи.',
    quality: 'high',
    speed: 'fast',
    featured: true,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    credits: 10,
    description: 'Когда нужен стиль/арт/«дорогая картинка» с характером.',
    quality: 'ultra',
    speed: 'medium',
    featured: true,
  },
  {
    id: 'z-image',
    name: 'Z-Image',
    credits: 6,
    description: 'Ровный универсал «на всякий случай», когда другие капризничают.',
    quality: 'ultra',
    speed: 'medium',
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    credits: 7,
    description: 'Постеры/баннеры, текст в картинке и дизайн-композиции.',
    quality: 'high',
    speed: 'medium',
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image',
    credits: 4,
    description: 'Быстрые итерации и правки, нормально переваривает RU/EN промпты.',
    quality: 'high',
    speed: 'fast',
  },
  {
    id: 'imagen-4-ultra',
    name: 'Imagen 4 Ultra',
    credits: 12,
    description: 'Чистота, точность, печатный «глянец» (особенно для бренда/маркетинга).',
    quality: 'ultra',
    speed: 'medium',
  },
];

export const VIDEO_MODELS: DisplayModel[] = [
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    credits: 70,
    description: 'Премиальный «кинореал» + синхро-аудио, топ под рекламу/вау-ролики.',
    quality: 'ultra',
    speed: 'slow',
    featured: true,
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    credits: 60,
    description: 'Максимум качества/стабильности сцены, когда важна «киношность».',
    quality: 'ultra',
    speed: 'slow',
    featured: true,
  },
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    credits: 55,
    description: 'Сильный универсал: динамика, эффектность, часто лучший «первый результат».',
    quality: 'ultra',
    speed: 'medium',
    featured: true,
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    credits: 40,
    description: 'Универсальная генерация видео: сцены, движение, стабильность.',
    quality: 'high',
    speed: 'medium',
    featured: true,
  },
  {
    id: 'sora-storyboard',
    name: 'Sora Storyboard',
    credits: 50,
    description: 'Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.',
    quality: 'high',
    speed: 'medium',
  },
  {
    id: 'seedance-pro',
    name: 'Seedance Pro',
    credits: 35,
    description: 'Быстрые ролики «пачкой» для тестов креативов и контент-завода.',
    quality: 'standard',
    speed: 'fast',
  },
];

