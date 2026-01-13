export type ModelCategory = "image" | "video";

export type ModelLanding = {
  slug: string;
  name: string;
  category: ModelCategory;
  // Generator model id (if available in current UI). If undefined -> show "soon" + CTA to category page.
  generatorModelId?: string;
  // Optional URL variant for unified models (Kling/WAN), e.g. "2.6", "2.5-turbo", "2.1-pro", "2.5"
  generatorVariant?: string;
  // Optional extra URL params for generator (e.g. Veo quality=quality)
  generatorParams?: Record<string, string>;
  // Optional hint shown on page (e.g., "выберите версию 2.6 в настройках")
  generatorHint?: string;
  // One-line value prop for meta/hero.
  description: string;
  // Keywords for meta.
  keywords: string[];
};

export const MODEL_LANDINGS: ModelLanding[] = [
  // ===== IMAGES =====
  {
    slug: "gpt-image-1-5",
    name: "GPT Image 1.5",
    category: "image",
    generatorModelId: "gpt-image",
    description: "Нейросеть для генерации и редактирования изображений по тексту и референсу.",
    keywords: [
      "gpt image 1.5",
      "gpt image lensroom",
      "openai image",
      "генерация изображений",
      "изображение по тексту",
      "редактирование изображения нейросеть",
      "нейросеть для картинок онлайн",
      "lensroom gpt",
    ],
  },
  {
    slug: "seedream-4-5",
    name: "Seedream 4.5",
    category: "image",
    generatorModelId: "seedream-4.5",
    description: "Генерация изображений в высоком качестве: детали, стиль и стабильный результат.",
    keywords: [
      "seedream 4.5",
      "seedream lensroom",
      "генерация изображений нейросеть",
      "картинка по тексту",
      "нейросеть для изображений",
      "создать изображение онлайн",
      "lensroom seedream",
    ],
  },
  {
    slug: "z-image",
    name: "Z-Image",
    category: "image",
    generatorModelId: "z-image",
    description: "Самый доступный способ создать изображение по тексту — быстро и недорого.",
    keywords: [
      "z-image",
      "z-image lensroom",
      "генерация изображений дешево",
      "картинка по тексту онлайн",
      "нейросеть для картинок",
      "создать картинку недорого",
      "lensroom z-image",
    ],
  },
  {
    slug: "nano-banana-pro",
    name: "Nano Banana Pro",
    category: "image",
    generatorModelId: "nano-banana-pro",
    description: "Премиальная генерация изображений: 1K–4K, варианты и режим фото→фото. Безлимит в Creator+ и Business.",
    keywords: [
      "nano banana pro",
      "nano banana pro lensroom",
      "nano banana безлимит",
      "нейросеть для фото",
      "генерация изображений 4k",
      "image to image",
      "создать фото нейросеть",
      "lensroom nano banana",
      "безлимитная генерация фото",
    ],
  },
  {
    slug: "grok-imagine",
    name: "Grok Imagine",
    category: "image",
    generatorModelId: "grok-imagine",
    description: "Креативная генерация изображений: необычные идеи, стиль и быстрый результат.",
    keywords: [
      "grok imagine",
      "xai image",
      "генерация картинок",
      "изображение по тексту",
      "нейросеть для картинок онлайн",
    ],
  },

  // ===== VIDEOS =====
  {
    slug: "kling-motion-control",
    name: "Kling AI 2.6 Motion Control",
    category: "video",
    generatorModelId: "kling-motion-control",
    description: "Перенос движений, жестов и мимики из motion‑референса на вашего персонажа.",
    keywords: [
      "kling motion control",
      "kling motion control lensroom",
      "motion control нейросеть",
      "перенос движений на персонажа",
      "ai видео",
      "генерация видео по референсу",
      "lensroom motion control",
    ],
  },
  {
    slug: "kling-2-6",
    name: "Kling 2.6",
    category: "video",
    generatorModelId: "kling",
    generatorVariant: "2.6",
    description: "Генерация видео с Kling: реализм, динамика и режимы text→video / image→video.",
    keywords: [
      "kling 2.6",
      "kling 2.6 lensroom",
      "kling ai",
      "генерация видео нейросеть",
      "видео по тексту",
      "видео по картинке",
      "lensroom kling",
    ],
  },
  {
    slug: "kling-2-5-turbo",
    name: "Kling 2.5 Turbo",
    category: "video",
    generatorModelId: "kling",
    generatorVariant: "2.5-turbo",
    description: "Быстрая генерация видео: оптимальный баланс скорости и качества для коротких роликов.",
    keywords: [
      "kling 2.5 turbo",
      "kling turbo",
      "генерация видео быстро",
      "ai видео генератор",
      "создать видео онлайн",
    ],
  },
  {
    slug: "kling-2-1",
    name: "Kling 2.1",
    category: "video",
    generatorModelId: "kling",
    generatorVariant: "2.1-pro",
    description: "Премиум‑качество генерации видео: более стабильные сцены и детализация.",
    keywords: [
      "kling 2.1",
      "kling 2.1 pro",
      "генерация видео нейросеть",
      "ai видео",
      "создать видео по тексту",
    ],
  },
  {
    slug: "wan-2-6",
    name: "Wan 2.6",
    category: "video",
    generatorModelId: "wan",
    generatorVariant: "2.6",
    description: "Генерация видео WAN: быстрые ролики, разные форматы и режимы генерации.",
    keywords: [
      "wan 2.6",
      "wan ai",
      "генерация видео",
      "видео по тексту",
      "нейросеть для видео онлайн",
    ],
  },
  {
    slug: "wan-2-5",
    name: "Wan 2.5",
    category: "video",
    generatorModelId: "wan",
    generatorVariant: "2.5",
    description: "Универсальная генерация видео: стабильный результат для большинства сценариев.",
    keywords: [
      "wan 2.5",
      "wan ai видео",
      "генерация видео нейросеть",
      "создать видео",
      "video ai",
    ],
  },
  {
    slug: "veo-3-1",
    name: "Veo 3.1",
    category: "video",
    generatorModelId: "veo-3.1",
    description: "Veo 3.1: реалистичные видео, кинематографичный стиль и высокое качество.",
    keywords: [
      "veo 3.1",
      "veo 3.1 lensroom",
      "veo ai",
      "veo google",
      "генерация видео",
      "ai видео генератор",
      "создать видео по тексту",
      "lensroom veo",
    ],
  },
  {
    slug: "veo-3-1-fast",
    name: "Veo 3.1 Fast",
    category: "video",
    generatorModelId: "veo-3.1",
    generatorParams: { quality: "fast" },
    description: "Veo 3.1 Fast: быстрая генерация видео для тестов идей и быстрых итераций.",
    keywords: [
      "veo 3.1 fast",
      "veo 3.1 fast lensroom",
      "veo ai fast",
      "быстрая генерация видео",
      "ai видео генератор",
      "создать видео по тексту",
      "lensroom veo fast",
    ],
  },
  {
    slug: "veo-3-1-quality",
    name: "Veo 3.1 Quality",
    category: "video",
    generatorModelId: "veo-3.1",
    generatorParams: { quality: "quality" },
    description: "Veo 3.1 Quality: максимум качества и детализации для кинематографичного видео.",
    keywords: [
      "veo 3.1 quality",
      "veo 3.1 quality lensroom",
      "veo ai качество",
      "генерация видео 1080p",
      "ai видео генератор",
      "создать видео по тексту",
      "lensroom veo качество",
    ],
  },
  {
    slug: "sora-2",
    name: "Sora 2",
    category: "video",
    generatorModelId: "sora-2",
    description: "Sora 2: генерация видео по тексту и изображениям для креативных задач.",
    keywords: [
      "sora 2",
      "sora 2 lensroom",
      "openai sora",
      "sora openai онлайн",
      "генерация видео нейросеть",
      "видео по тексту",
      "ai видео онлайн",
      "lensroom sora",
    ],
  },
  {
    slug: "sora-2-pro",
    name: "Sora 2 Pro",
    category: "video",
    generatorModelId: "sora-2-pro",
    description: "Sora 2 Pro: премиальная генерация видео — больше деталей и более стабильные сцены.",
    keywords: [
      "sora 2 pro",
      "openai sora pro",
      "генерация видео нейросеть",
      "видео по тексту",
      "ai видео онлайн",
    ],
  },
  {
    slug: "sora-storyboard",
    name: "Sora Storyboard",
    category: "video",
    generatorModelId: "sora-storyboard",
    description: "Sora Storyboard: создавайте видео из нескольких сцен (сториборд) по одному описанию.",
    keywords: [
      "sora storyboard",
      "storyboard нейросеть",
      "сделать сториборд",
      "генерация видео по сценам",
      "ai видео",
    ],
  },
  {
    slug: "kling-o1",
    name: "Kling O1",
    category: "video",
    generatorModelId: "kling-o1",
    generatorHint: "Для Kling O1 нужен минимум стартовый кадр (Start Image). Можно добавить End Image для более точного результата.",
    description: "Kling O1: генерация видео по стартовому (и финальному) кадру — First→Last.",
    keywords: [
      "kling o1",
      "first last frame",
      "image to video",
      "нейросеть видео по картинке",
      "ai видео генератор",
    ],
  },

  // Mentioned by you, but not currently present in /generator model list.
  {
    slug: "seedance-pro",
    name: "Seedance Pro",
    category: "video",
    description: "AI‑видео эффекты и стили: подборки и идеи для вдохновения.",
    keywords: [
      "seedance",
      "seedance pro",
      "ai видео эффекты",
      "видео нейросеть",
    ],
  },
  {
    slug: "seedream-4-0",
    name: "Seedream 4.0",
    category: "image",
    description: "Генерация изображений по тексту: стиль, детали и быстрый результат.",
    keywords: [
      "seedream 4.0",
      "генерация изображений",
      "картинка по тексту",
      "нейросеть для изображений",
    ],
  },
];

export function getModelLandingBySlug(slug: string): ModelLanding | undefined {
  return MODEL_LANDINGS.find((m) => m.slug === slug);
}


