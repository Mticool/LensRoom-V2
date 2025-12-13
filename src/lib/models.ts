import type { AIModel, ContentType } from "@/types/generator";

// ===== PHOTO MODELS =====

export const PHOTO_MODELS: AIModel[] = [
  {
    id: "seedream-4.5",
    name: "Seedream 4.5",
    provider: "kie.ai",
    category: "photo",
    rank: 1,
    apiId: "seedream-4.5",
    endpoint: "/v1/generate/image",
    description: "Самый «рекламный» фотореал, хорошо держит композицию.",
    creditCost: 5,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
  {
    id: "flux-2",
    name: "FLUX.2",
    provider: "kie.ai",
    category: "photo",
    rank: 2,
    apiId: "flux-2",
    endpoint: "/v1/generate/image",
    description: "Топ по фактурам/материалам (предметка, упаковка, ткань, металл).",
    creditCost: 8,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "kie.ai",
    category: "photo",
    rank: 3,
    apiId: "nano-banana-pro",
    endpoint: "/v1/generate/image",
    description: "Лучший баланс цена/скорость/качество + стабильные персонажи.",
    creditCost: 3,
    speed: "fast",
    quality: "high",
    featured: true,
  },
  {
    id: "midjourney",
    name: "Midjourney (MJ) — Artistic",
    provider: "midjourney",
    category: "photo",
    rank: 4,
    apiId: "midjourney",
    endpoint: "/v1/generate/image",
    description: "Когда нужен стиль/арт/«дорогая картинка» с характером.",
    creditCost: null,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
  {
    id: "imagen-4-ultra",
    name: "Imagen 4 Ultra",
    provider: "google",
    category: "photo",
    rank: 5,
    apiId: "imagen-4-ultra",
    endpoint: "/v1/generate/image",
    description: "Чистота, точность, печатный «глянец» (особенно для бренда/маркетинга).",
    creditCost: null,
    speed: "medium",
    quality: "ultra",
  },
  {
    id: "z-image",
    name: "Z-Image",
    provider: "kie.ai",
    category: "photo",
    rank: 6,
    apiId: "z-image",
    endpoint: "/v1/generate/image",
    description: "Ровный универсал «на всякий случай», когда другие капризничают.",
    creditCost: 6,
    speed: "medium",
    quality: "ultra",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    provider: "ideogram",
    category: "photo",
    rank: 7,
    apiId: "ideogram",
    endpoint: "/v1/generate/image",
    description: "Постеры/баннеры, текст в картинке и дизайн-композиции.",
    creditCost: null,
    speed: "medium",
    quality: "high",
  },
  {
    id: "qwen-image",
    name: "Qwen Image",
    provider: "alibaba",
    category: "photo",
    rank: 8,
    apiId: "qwen-image",
    endpoint: "/v1/generate/image",
    description: "Быстрые итерации и правки, нормально переваривает RU/EN промпты.",
    creditCost: null,
    speed: "fast",
    quality: "high",
  },
];

// ===== VIDEO MODELS =====

export const VIDEO_MODELS: AIModel[] = [
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    provider: "google",
    category: "video",
    rank: 1,
    apiId: "veo-3.1",
    endpoint: "/v1/generate/video",
    description: "Премиальный «кинореал» + синхро-аудио, топ под рекламу/вау-ролики.",
    creditCost: 70,
    speed: "slow",
    quality: "ultra",
    featured: true,
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "kie.ai",
    category: "video",
    rank: 2,
    apiId: "sora-2-pro",
    endpoint: "/v1/generate/video",
    description: "Максимум качества/стабильности сцены, когда важна «киношность».",
    creditCost: 60,
    speed: "slow",
    quality: "ultra",
    featured: true,
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    provider: "kie.ai",
    category: "video",
    rank: 3,
    apiId: "kling-2.6",
    endpoint: "/v1/generate/video",
    description: "Сильный универсал: динамика, эффектность, часто лучший «первый результат».",
    creditCost: 55,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "kie.ai",
    category: "video",
    rank: 4,
    apiId: "sora-2",
    endpoint: "/v1/generate/video",
    description: "Универсальная генерация видео: сцены, движение, стабильность.",
    creditCost: 40,
    speed: "medium",
    quality: "high",
    featured: true,
  },
  {
    id: "sora-2-pro-storyboard",
    name: "Sora 2 Storyboard",
    provider: "kie.ai",
    category: "video",
    rank: 5,
    apiId: "sora-2-pro-storyboard",
    endpoint: "/v1/generate/video",
    description: "Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.",
    creditCost: 50,
    speed: "medium",
    quality: "high",
  },
  {
    id: "seedance-1.0",
    name: "Seedance (Fast)",
    provider: "kie.ai",
    category: "video",
    rank: 6,
    apiId: "seedance-1.0",
    endpoint: "/v1/generate/video",
    description: "Быстрые ролики «пачкой» для тестов креативов и контент-завода.",
    creditCost: 35,
    speed: "fast",
    quality: "standard",
  },
];

// ===== PRODUCT MODELS =====

export const PRODUCT_MODELS: AIModel[] = [
  {
    id: "product-nano-banana",
    name: "Product Quick",
    provider: "kie.ai",
    category: "product",
    rank: 1,
    apiId: "nano-banana-pro",
    endpoint: "/v1/generate/image",
    description: "Быстрая чистая предметка: читаемо, минимум артефактов.",
    creditCost: 3,
    speed: "fast",
    quality: "high",
    featured: true,
  },
  {
    id: "product-flux",
    name: "Product Pro",
    provider: "kie.ai",
    category: "product",
    rank: 2,
    apiId: "flux-2",
    endpoint: "/v1/generate/image",
    description: "Премиум-рендер: материалы, текстуры, «рекламный» вид.",
    creditCost: 5,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
];

// ===== INTERNAL API MODELS (hidden from UI) =====

export const INTERNAL_MODELS: AIModel[] = [
  {
    id: "nano-banana-api",
    name: "Nano Banana API",
    provider: "kie.ai",
    category: "photo",
    rank: 99,
    apiId: "nano-banana-api",
    endpoint: "/v1/generate/image",
    description: "Internal API model",
    creditCost: 2,
    speed: "fast",
    quality: "standard",
    hidden: true,
  },
  {
    id: "seedream-api",
    name: "Seedream API",
    provider: "kie.ai",
    category: "photo",
    rank: 99,
    apiId: "seedream-api",
    endpoint: "/v1/generate/image",
    description: "Internal API model",
    creditCost: 4,
    speed: "medium",
    quality: "high",
    hidden: true,
  },
  {
    id: "veo-3.1-api",
    name: "Veo 3.1 API",
    provider: "kie.ai",
    category: "video",
    rank: 99,
    apiId: "veo-3.1-api",
    endpoint: "/v1/generate/video",
    description: "Internal API model",
    creditCost: 70,
    speed: "slow",
    quality: "ultra",
    hidden: true,
  },
  {
    id: "seedance-api",
    name: "Seedance API",
    provider: "kie.ai",
    category: "video",
    rank: 99,
    apiId: "seedance-api",
    endpoint: "/v1/generate/video",
    description: "Internal API model",
    creditCost: 35,
    speed: "fast",
    quality: "standard",
    hidden: true,
  },
];

// ===== ALL MODELS =====

export const ALL_MODELS: AIModel[] = [
  ...PHOTO_MODELS,
  ...VIDEO_MODELS,
  ...PRODUCT_MODELS,
  ...INTERNAL_MODELS,
];

// ===== PUBLIC MODELS (sorted by rank, non-hidden) =====

export const PUBLIC_PHOTO_MODELS = PHOTO_MODELS
  .filter(m => !m.hidden)
  .sort((a, b) => a.rank - b.rank);

export const PUBLIC_VIDEO_MODELS = VIDEO_MODELS
  .filter(m => !m.hidden)
  .sort((a, b) => a.rank - b.rank);

export const PUBLIC_PRODUCT_MODELS = PRODUCT_MODELS
  .filter(m => !m.hidden)
  .sort((a, b) => a.rank - b.rank);

// ===== FEATURED MODELS (ranks 1-4) =====

export const FEATURED_PHOTO_MODELS = PUBLIC_PHOTO_MODELS.filter(m => m.featured);
export const FEATURED_VIDEO_MODELS = PUBLIC_VIDEO_MODELS.filter(m => m.featured);

// ===== HELPER FUNCTIONS =====

export const getModelsByCategory = (category: ContentType): AIModel[] => {
  switch (category) {
    case "photo":
      return PUBLIC_PHOTO_MODELS;
    case "video":
      return PUBLIC_VIDEO_MODELS;
    case "product":
      return PUBLIC_PRODUCT_MODELS;
    default:
      return PUBLIC_PHOTO_MODELS;
  }
};

export const getModelById = (id: string): AIModel | undefined => {
  return ALL_MODELS.find((model) => model.id === id);
};

export const getDefaultModel = (category: ContentType): AIModel => {
  const models = getModelsByCategory(category);
  return models[0];
};

export const getModelsBySpeed = (speed: "fast" | "medium" | "slow"): AIModel[] => {
  return ALL_MODELS.filter((model) => model.speed === speed && !model.hidden);
};

export const getModelsByQuality = (quality: "standard" | "high" | "ultra"): AIModel[] => {
  return ALL_MODELS.filter((model) => model.quality === quality && !model.hidden);
};

export const getModelCreditCost = (modelId: string): number | null => {
  const model = getModelById(modelId);
  return model?.creditCost ?? null;
};

/**
 * Format credit cost for display
 * Returns "—" for null (TBD), otherwise the number
 */
export const formatCreditCost = (cost: number | null): string => {
  return cost === null ? "—" : String(cost);
};

// Для обратной совместимости
export const photoModels = PUBLIC_PHOTO_MODELS;
export const videoModels = PUBLIC_VIDEO_MODELS;
export const productModels = PUBLIC_PRODUCT_MODELS;
export const allModels = ALL_MODELS;
export const getModelsByType = getModelsByCategory;
