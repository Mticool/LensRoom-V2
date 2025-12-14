export interface Prompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  imageUrl: string;
  downloads: number;
  rating: number;
  isPremium: boolean;
  price?: number;
}

export const PROMPT_CATEGORIES = [
  'Все',
  'Портреты',
  'Пейзажи',
  'Аниме',
  'Фэнтези',
  'Sci-Fi',
  'Архитектура',
  'Продукты',
  'Абстракция',
];

export const MOCK_PROMPTS: Prompt[] = [
  {
    id: '1',
    title: 'Кинематографичный портрет',
    description: 'Создайте профессиональный портрет в стиле кино',
    prompt: 'Cinematic portrait, dramatic lighting, shallow depth of field, 85mm lens, golden hour, professional photography',
    category: 'Портреты',
    tags: ['портрет', 'кино', 'драматичный'],
    imageUrl: 'https://picsum.photos/seed/p1/400/500',
    downloads: 1250,
    rating: 4.8,
    isPremium: false,
  },
  {
    id: '2',
    title: 'Аниме персонаж',
    description: 'Детализированный аниме персонаж',
    prompt: 'Anime character, detailed eyes, vibrant colors, dynamic pose, studio lighting, high quality',
    category: 'Аниме',
    tags: ['аниме', 'персонаж', 'яркий'],
    imageUrl: 'https://picsum.photos/seed/p2/400/500',
    downloads: 2340,
    rating: 4.9,
    isPremium: false,
  },
  {
    id: '3',
    title: 'Футуристический город',
    description: 'Город будущего с неоновыми огнями',
    prompt: 'Futuristic cityscape, neon lights, cyberpunk aesthetic, rain, reflections, night scene, ultra detailed',
    category: 'Sci-Fi',
    tags: ['город', 'киберпанк', 'неон'],
    imageUrl: 'https://picsum.photos/seed/p3/400/500',
    downloads: 1890,
    rating: 4.7,
    isPremium: true,
    price: 99,
  },
  {
    id: '4',
    title: 'Горный пейзаж',
    description: 'Величественные горы на закате',
    prompt: 'Mountain landscape, sunset, dramatic clouds, golden light, photorealistic, 8k resolution',
    category: 'Пейзажи',
    tags: ['горы', 'закат', 'природа'],
    imageUrl: 'https://picsum.photos/seed/p4/400/500',
    downloads: 980,
    rating: 4.6,
    isPremium: false,
  },
  {
    id: '5',
    title: 'Продуктовая съёмка',
    description: 'Профессиональная съёмка продукта',
    prompt: 'Product photography, studio lighting, white background, commercial quality, sharp focus, professional',
    category: 'Продукты',
    tags: ['продукт', 'коммерция', 'студия'],
    imageUrl: 'https://picsum.photos/seed/p5/400/500',
    downloads: 3200,
    rating: 4.9,
    isPremium: true,
    price: 149,
  },
];



