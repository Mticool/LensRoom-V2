import type { LucideIcon } from 'lucide-react';
import { Bolt, Film, Gauge, Wallet, Edit3, SlidersHorizontal, Clapperboard } from 'lucide-react';

export type DesktopFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type DesktopCase = {
  title: string;
  model: string;
  prompt: string;
  href: string;
  image: string;
};

export type DesktopStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type DesktopModelBucket = {
  title: string;
  items: Array<{ name: string; status: string }>;
};

export type DesktopGeneration = {
  title: string;
  tag: string;
  image: string;
  href: string;
};

export const desktopFeatures: DesktopFeature[] = [
  {
    title: 'Скорость рендеринга',
    description: 'Генерация контента за считанные минуты на распределенной GPU-инфраструктуре.',
    icon: Bolt,
  },
  {
    title: 'Топовые нейросети',
    description: 'Veo, Kling, Sora и лучшие фото-модели в едином рабочем пространстве.',
    icon: Film,
  },
  {
    title: 'Контроль движения',
    description: 'Motion Control и точная настройка динамики кадра под продакшен-задачи.',
    icon: Gauge,
  },
  {
    title: 'Единый баланс',
    description: 'Одна система звёзд для видео, фото и других режимов генерации.',
    icon: Wallet,
  },
];

export const desktopCases: DesktopCase[] = [
  {
    title: 'Киберпанк город',
    model: 'Kling 2.6',
    prompt: 'Cinematic close-up of a futuristic cyberpunk city at night, neon lights, volumetric lighting.',
    href: '/create/studio?section=video&model=kling-2.6&prompt=Cinematic%20close-up%20of%20a%20futuristic%20cyberpunk%20city%20at%20night%2C%20neon%20lights%2C%20volumetric%20lighting.',
    image: '/showcase/2.jpg',
  },
  {
    title: 'Исландия на рассвете',
    model: 'Veo 3.1 Fast',
    prompt: 'Cinematic wide shot, epic mountains in Iceland during sunrise, misty atmosphere, sharp focus.',
    href: '/create/studio?section=video&model=veo-3.1-fast&prompt=Cinematic%20wide%20shot%2C%20epic%20mountains%20in%20Iceland%20during%20sunrise%2C%20misty%20atmosphere%2C%20sharp%20focus.',
    image: '/showcase/1.jpg',
  },
  {
    title: 'Лукбук персонажа',
    model: 'Nano Banana Pro',
    prompt: 'A majestic samurai standing in a rainy forest, cinematic style, emotional atmosphere.',
    href: '/create/studio?section=photo&model=nano-banana-pro&prompt=A%20majestic%20samurai%20standing%20in%20a%20rainy%20forest%2C%20cinematic%20style%2C%20emotional%20atmosphere.',
    image: '/showcase/5.jpg',
  },
];

export const desktopSteps: DesktopStep[] = [
  {
    title: 'Напишите сценарий',
    description: 'Опишите сцену естественным языком. Платформа понимает кино-терминологию и стиль.',
    icon: Edit3,
  },
  {
    title: 'Настройте параметры',
    description: 'Выберите модель, формат кадра, интенсивность движения и дополнительные настройки.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Рендер и экспорт',
    description: 'Получите результат в высоком качестве и сразу отправляйте в production.',
    icon: Clapperboard,
  },
];

export const desktopModelBuckets: DesktopModelBucket[] = [
  {
    title: 'Видео модели',
    items: [
      { name: 'Veo 3.1 Fast', status: 'Активен' },
      { name: 'Kling 2.6', status: 'Активен' },
      { name: 'Sora 2', status: 'Активен' },
    ],
  },
  {
    title: 'Фото модели',
    items: [
      { name: 'Nano Banana Pro', status: '4K' },
      { name: 'Flux.2 Pro', status: 'Pro' },
      { name: 'GPT Image 1.5', status: 'Точно' },
    ],
  },
  {
    title: 'Спец. режимы',
    items: [
      { name: 'Motion Control', status: 'Движение' },
      { name: 'Start/End кадры', status: 'Видео' },
      { name: 'V2V reference', status: 'Контроль' },
    ],
  },
];

export const desktopGenerations: DesktopGeneration[] = [
  {
    title: 'Неоновый киберпанк',
    tag: 'Кино',
    image: '/showcase/2.jpg',
    href: '/inspiration',
  },
  {
    title: 'Smart Lens Promo',
    tag: 'Продукт',
    image: '/showcase/4.jpg',
    href: '/inspiration',
  },
  {
    title: 'Дрон в Исландии',
    tag: 'UGC/Travel',
    image: '/showcase/1.jpg',
    href: '/inspiration',
  },
  {
    title: 'Cinematic Portrait',
    tag: 'Portrait',
    image: '/showcase/5.jpg',
    href: '/inspiration',
  },
];
