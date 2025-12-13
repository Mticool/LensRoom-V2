// ===== AI MODELS =====

export const AI_PHOTO_MODELS = [
  { id: "flux", name: "Flux", description: "Быстрая и качественная генерация" },
  { id: "midjourney", name: "Midjourney", description: "Художественный стиль" },
  { id: "dalle", name: "DALL-E 3", description: "Точное следование промпту" },
  { id: "stable-diffusion", name: "Stable Diffusion", description: "Гибкие настройки" },
] as const;

export const AI_VIDEO_MODELS = [
  { id: "runway", name: "Runway Gen-3", description: "Профессиональное качество" },
  { id: "kling", name: "Kling", description: "Реалистичные движения" },
  { id: "luma", name: "Luma Dream Machine", description: "Креативные видео" },
] as const;

// ===== ASPECT RATIOS =====

export const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", width: 1024, height: 1024 },
  { value: "16:9", label: "16:9", width: 1280, height: 720 },
  { value: "9:16", label: "9:16", width: 720, height: 1280 },
  { value: "4:3", label: "4:3", width: 1024, height: 768 },
  { value: "3:4", label: "3:4", width: 768, height: 1024 },
  { value: "21:9", label: "21:9", width: 1680, height: 720 },
] as const;

// ===== PRICING =====

export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Старт",
    price: 990,
    credits: 100,
    features: [
      "100 кредитов",
      "Все AI модели",
      "Базовое качество",
      "Стандартная скорость",
    ],
  },
  {
    id: "optimal",
    name: "Оптимальный",
    price: 1990,
    credits: 300,
    popular: true,
    features: [
      "300 кредитов",
      "Все AI модели",
      "HD качество",
      "Приоритетная очередь",
      "Без водяных знаков",
    ],
  },
  {
    id: "maximum",
    name: "Максимум",
    price: 4990,
    credits: 1000,
    features: [
      "1000 кредитов",
      "Все AI модели",
      "4K качество",
      "Мгновенная генерация",
      "Без водяных знаков",
      "API доступ",
      "Приоритетная поддержка",
    ],
  },
] as const;

// ===== CREDITS COST =====

export const CREDITS_COST = {
  photo: {
    flux: 1,
    midjourney: 2,
    dalle: 2,
    "stable-diffusion": 1,
  },
  video: {
    runway: 10,
    kling: 8,
    luma: 8,
  },
  product: 3,
} as const;

// ===== ROUTES =====

export const ROUTES = {
  home: "/",
  create: "/create",
  createPhoto: "/create/photo",
  createVideo: "/create/video",
  createProduct: "/create/product",
  library: "/library",
  inspiration: "/inspiration",
  pricing: "/pricing",
  profile: "/profile",
  settings: "/settings",
  apiDocs: "/api-docs",
} as const;

