// Video Models Configuration

export interface VideoModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider: 'google' | 'kling' | 'openai' | 'wan';
  featured?: boolean;
  comingSoon?: boolean;
  pricing: {
    base: number; // stars per generation
    perSecond?: number;
  };
  capabilities: {
    maxDuration: number; // seconds
    resolutions: string[];
    modes: ('t2v' | 'i2v' | 'v2v')[];
    audio?: boolean;
  };
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'veo-3-1',
    name: 'Google Veo 3.1',
    description: 'Флагманская модель Google для генерации видео с превосходным качеством и реалистичной физикой',
    icon: '🎬',
    provider: 'google',
    featured: true,
    pricing: { base: 150, perSecond: 15 },
    capabilities: {
      maxDuration: 10,
      resolutions: ['720p', '1080p'],
      modes: ['t2v', 'i2v'],
      audio: true,
    },
  },
  {
    id: 'kling-2-6',
    name: 'Kling 2.6',
    description: 'Продвинутая модель с отличной детализацией и плавными движениями',
    icon: '🎥',
    provider: 'kling',
    pricing: { base: 120, perSecond: 12 },
    capabilities: {
      maxDuration: 10,
      resolutions: ['720p', '1080p'],
      modes: ['t2v', 'i2v'],
      audio: false,
    },
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    description: 'Модель от OpenAI с кинематографичным качеством',
    icon: '🌀',
    provider: 'openai',
    comingSoon: true,
    pricing: { base: 200, perSecond: 20 },
    capabilities: {
      maxDuration: 20,
      resolutions: ['720p', '1080p', '4k'],
      modes: ['t2v', 'i2v'],
      audio: true,
    },
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    description: 'Профессиональная версия Sora с расширенными возможностями',
    icon: '⚡',
    provider: 'openai',
    comingSoon: true,
    pricing: { base: 350, perSecond: 35 },
    capabilities: {
      maxDuration: 60,
      resolutions: ['1080p', '4k'],
      modes: ['t2v', 'i2v', 'v2v'],
      audio: true,
    },
  },
  {
    id: 'wan-2-6',
    name: 'WAN 2.6',
    description: 'Быстрая и качественная генерация с поддержкой Multi-shot',
    icon: '🚀',
    provider: 'wan',
    pricing: { base: 80, perSecond: 8 },
    capabilities: {
      maxDuration: 15,
      resolutions: ['720p', '1080p', '1080p_multi'],
      modes: ['t2v', 'i2v', 'v2v'],
      audio: true,
    },
  },
  {
    id: 'wan-2-5',
    name: 'WAN 2.5',
    description: 'Стабильная модель с хорошим соотношением цена/качество',
    icon: '✨',
    provider: 'wan',
    pricing: { base: 60, perSecond: 6 },
    capabilities: {
      maxDuration: 10,
      resolutions: ['720p', '1080p'],
      modes: ['t2v', 'i2v'],
      audio: true,
    },
  },
  {
    id: 'kling-avatar',
    name: 'Kling AI Avatar',
    description: 'Создание говорящих аватаров с синхронизацией губ',
    icon: '👤',
    provider: 'kling',
    pricing: { base: 100, perSecond: 10 },
    capabilities: {
      maxDuration: 30,
      resolutions: ['720p', '1080p'],
      modes: ['i2v'],
      audio: true,
    },
  },
];

export const EXAMPLE_PROMPTS = [
  {
    id: 1,
    title: 'Космический закат',
    prompt: 'Astronaut floating in space watching a beautiful sunset over Earth, cinematic lighting, 4K quality',
    thumbnail: '/examples/space.jpg',
  },
  {
    id: 2,
    title: 'Городской дождь',
    prompt: 'Rainy night in Tokyo, neon lights reflecting on wet streets, cyberpunk atmosphere, slow motion',
    thumbnail: '/examples/rain.jpg',
  },
  {
    id: 3,
    title: 'Природа',
    prompt: 'Majestic waterfall in tropical forest, morning mist, birds flying, peaceful atmosphere',
    thumbnail: '/examples/nature.jpg',
  },
];

export function getModelById(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}

export function getFeaturedModel(): VideoModel {
  return VIDEO_MODELS.find(m => m.featured) || VIDEO_MODELS[0];
}