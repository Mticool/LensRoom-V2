import type { AIModel, ContentType } from "@/types/generator";

// ===== PHOTO MODELS =====

export const PHOTO_MODELS: AIModel[] = [
  {
    id: "seedream-4.5",
    name: "Seedream 4.5",
    provider: "kie.ai",
    category: "photo",
    rank: 1,
    apiId: "seedream/4.5-text-to-image", // Correct KIE API ID
    endpoint: "/v1/generate/image",
    description: "Самый «рекламный» фотореал, хорошо держит композицию.",
    creditCost: 5,
    speed: "medium",
    quality: "ultra",
    featured: true,
    supportsI2i: true,
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "kie.ai",
    category: "photo",
    rank: 2,
    apiId: "nano-banana-pro", // Works as-is
    endpoint: "/v1/generate/image",
    description: "Лучший баланс цена/скорость/качество + стабильные персонажи.",
    creditCost: 3,
    speed: "fast",
    quality: "high",
    featured: true,
    supportsI2i: true,
  },
];

// Note: Other models (Midjourney, Imagen, Ideogram, etc.) require different KIE subscription tier

// ===== VIDEO MODELS =====

export const VIDEO_MODELS: AIModel[] = [
  {
    id: "kling-2.1",
    name: "Kling 2.1",
    provider: "kie.ai",
    category: "video",
    rank: 1,
    apiId: "kling/v2-1-standard", // Correct KIE API ID
    endpoint: "/v1/generate/video",
    description: "Image-to-Video • Высокое качество • 5-10с",
    creditCost: 55,
    speed: "medium",
    quality: "ultra",
    featured: true,
    supportsI2v: true, // Only I2V supported
    supportsAudio: false,
  },
];

// Note: Other video models (Veo, Sora, etc.) require different KIE subscription tier

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
    id: "product-seedream",
    name: "Product Pro",
    provider: "kie.ai",
    category: "product",
    rank: 2,
    apiId: "seedream/4.5-text-to-image",
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
  // All internal models use the same working API IDs
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
