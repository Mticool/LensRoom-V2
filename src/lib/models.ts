import type { AIModel, ContentType } from "@/types/generator";

// ===== PHOTO MODELS =====

export const PHOTO_MODELS: AIModel[] = [
  {
    id: "z-image",
    name: "Z-Image",
    provider: "kie.ai",
    category: "photo",
    rank: 1,
    apiId: "z-image",
    endpoint: "/v1/generate/image",
    description: "Самый быстрый и дешевый вариант для тестов",
    creditCost: 1,
    speed: "fast",
    quality: "standard",
    featured: true,
  },
  {
    id: "imagen-4-fast",
    name: "Imagen 4 Fast",
    provider: "google",
    category: "photo",
    rank: 2,
    apiId: "imagen-4-fast",
    endpoint: "/v1/generate/image",
    description: "Быстрая версия Imagen для маркетинга и бренда",
    creditCost: 4,
    speed: "fast",
    quality: "high",
    featured: true,
  },
  {
    id: "seedream-4.5",
    name: "Seedream 4.5",
    provider: "kie.ai",
    category: "photo",
    rank: 3,
    apiId: "seedream-4.5",
    endpoint: "/v1/generate/image",
    description: "Самый «рекламный» фотореал, хорошо держит композицию.",
    creditCost: 7,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
  {
    id: "flux-2",
    name: "FLUX.2",
    provider: "kie.ai",
    category: "photo",
    rank: 4,
    apiId: "flux-2",
    endpoint: "/v1/generate/image",
    description: "Топ по фактурам/материалам (предметка, упаковка, ткань, металл).",
    creditCost: 5, // 1K base
    speed: "medium",
    quality: "ultra",
    featured: true,
    variants: [
      { id: "flux-2-1k", label: "1K", creditCost: 5 },
      { id: "flux-2-2k", label: "2K", creditCost: 7 },
    ],
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "kie.ai",
    category: "photo",
    rank: 5,
    apiId: "nano-banana-pro",
    endpoint: "/v1/generate/image",
    description: "Лучший баланс цена/скорость/качество + стабильные персонажи.",
    creditCost: 18, // 2K base
    speed: "fast",
    quality: "high",
    featured: true,
    variants: [
      { id: "nano-banana-pro-2k", label: "2K", creditCost: 18 },
      { id: "nano-banana-pro-4k", label: "4K", creditCost: 24 },
    ],
  },
  {
    id: "ideogram",
    name: "Ideogram V3",
    provider: "ideogram",
    category: "photo",
    rank: 6,
    apiId: "ideogram",
    endpoint: "/v1/generate/image",
    description: "Постеры/баннеры, текст в картинке и дизайн-композиции.",
    creditCost: 4, // Turbo base
    speed: "medium",
    quality: "high",
    variants: [
      { id: "ideogram-v3-turbo", label: "Turbo", creditCost: 4 },
      { id: "ideogram-v3-balanced", label: "Balanced", creditCost: 7 },
      { id: "ideogram-v3-quality", label: "Quality", creditCost: 10 },
    ],
  },
  {
    id: "qwen-image",
    name: "Qwen Image",
    provider: "alibaba",
    category: "photo",
    rank: 7,
    apiId: "qwen-image",
    endpoint: "/v1/generate/image",
    description: "Быстрые итерации и правки, нормально переваривает RU/EN промпты.",
    creditCost: 5, // 1024 base
    speed: "fast",
    quality: "high",
    variants: [
      { id: "qwen-1024", label: "1024", creditCost: 5 },
      { id: "qwen-1536x1024", label: "1536×1024", creditCost: 7 },
      { id: "qwen-2048", label: "2048", creditCost: 17 },
    ],
  },
  {
    id: "midjourney",
    name: "Midjourney",
    provider: "midjourney",
    category: "photo",
    rank: 8,
    apiId: "midjourney",
    endpoint: "/v1/generate/image",
    description: "Когда нужен стиль/арт/«дорогая картинка» с характером.",
    creditCost: 15,
    speed: "medium",
    quality: "ultra",
    featured: true,
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
    creditCost: 80, // Fast 8s base
    speed: "slow",
    quality: "ultra",
    featured: true,
    hasAudio: true,
    variants: [
      { id: "veo-3.1-fast-8s-audio", label: "Fast 8s", creditCost: 80 },
      { id: "veo-3.1-quality-8s-audio", label: "Quality 8s", creditCost: 400 },
    ],
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    provider: "kie.ai",
    category: "video",
    rank: 2,
    apiId: "kling-2.6",
    endpoint: "/v1/generate/video",
    description: "Сильный универсал: динамика, эффектность, часто лучший «первый результат».",
    creditCost: 55, // 5s base
    speed: "medium",
    quality: "ultra",
    featured: true,
    variants: [
      { id: "kling-2.6-5s", label: "5s", creditCost: 55 },
      { id: "kling-2.6-10s", label: "10s", creditCost: 110 },
      { id: "kling-2.6-5s-audio", label: "5s + Audio", creditCost: 110 },
      { id: "kling-2.6-10s-audio", label: "10s + Audio", creditCost: 220 },
    ],
  },
  {
    id: "seedance-pro",
    name: "Seedance Pro",
    provider: "kie.ai",
    category: "video",
    rank: 3,
    apiId: "seedance-pro",
    endpoint: "/v1/generate/video",
    description: "Быстрые ролики «пачкой» для тестов креативов и контент-завода.",
    creditCost: 30, // 720p 5s base
    speed: "fast",
    quality: "high",
    featured: true,
    variants: [
      { id: "seedance-pro-720p-5s", label: "720p 5s", creditCost: 30 },
      { id: "seedance-pro-720p-10s", label: "720p 10s", creditCost: 60 },
      { id: "seedance-pro-720p-15s", label: "720p 15s", creditCost: 90 },
      { id: "seedance-pro-1080p-5s", label: "1080p 5s", creditCost: 70 },
      { id: "seedance-pro-1080p-10s", label: "1080p 10s", creditCost: 140 },
      { id: "seedance-pro-1080p-15s", label: "1080p 15s", creditCost: 210 },
    ],
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
    creditCost: 15, // 5s base
    speed: "medium",
    quality: "high",
    featured: true,
    variants: [
      { id: "sora-2-5s", label: "5s", creditCost: 15 },
      { id: "sora-2-10s", label: "10s", creditCost: 30 },
      { id: "sora-2-15s", label: "15s", creditCost: 45 },
    ],
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "kie.ai",
    category: "video",
    rank: 5,
    apiId: "sora-2-pro",
    endpoint: "/v1/generate/video",
    description: "Максимум качества/стабильности сцены, когда важна «киношность».",
    creditCost: 150, // 720p 10s base
    speed: "slow",
    quality: "ultra",
    featured: true,
    variants: [
      { id: "sora-2-pro-10s", label: "720p 10s", creditCost: 150 },
      { id: "sora-2-pro-15s", label: "720p 15s", creditCost: 270 },
      { id: "sora-2-pro-1080-10s", label: "1080p 10s", creditCost: 330 },
      { id: "sora-2-pro-1080-15s", label: "1080p 15s", creditCost: 630 },
    ],
  },
  {
    id: "sora-2-storyboard",
    name: "Sora 2 Storyboard",
    provider: "kie.ai",
    category: "video",
    rank: 6,
    apiId: "sora-2-storyboard",
    endpoint: "/v1/generate/video",
    description: "Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.",
    creditCost: 150, // 10s base
    speed: "medium",
    quality: "high",
    variants: [
      { id: "sora-2-storyboard-10s", label: "10s", creditCost: 150 },
      { id: "sora-2-storyboard-15_25s", label: "15-25s", creditCost: 270 },
    ],
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
    creditCost: 18,
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
    creditCost: 7,
    speed: "medium",
    quality: "ultra",
    featured: true,
  },
];

// ===== INTERNAL API MODELS (hidden from UI) =====

export const INTERNAL_MODELS: AIModel[] = [];

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
  // Check main models first
  const model = ALL_MODELS.find((m) => m.id === id);
  if (model) return model;
  
  // Check variants
  for (const m of ALL_MODELS) {
    if (m.variants) {
      const variant = m.variants.find(v => v.id === id);
      if (variant) {
        return { ...m, creditCost: variant.creditCost };
      }
    }
  }
  
  return undefined;
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

export const getModelCreditCost = (modelId: string, variantId?: string): number | null => {
  const model = ALL_MODELS.find(m => m.id === modelId);
  if (!model) return null;
  
  if (variantId && model.variants) {
    const variant = model.variants.find(v => v.id === variantId);
    if (variant) return variant.creditCost;
  }
  
  return model.creditCost ?? null;
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
