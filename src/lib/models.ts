import type { AIModel, ContentType } from "@/types/generator";

// ===== PHOTO MODELS =====

export const PHOTO_MODELS: AIModel[] = [
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "kie.ai",
    category: "photo",
    apiId: "nano-banana-pro",
    endpoint: "/v1/generate/image",
    logo: "/logos/nano-banana.svg",
    description: "Быстрая генерация качественных изображений",
    creditCost: 3,
    speed: "fast",
    quality: "high",
    bestFor: ["Быстрые концепты", "Итерации", "Тестирование"],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      maxResolution: "1024x1024",
    },
    defaultParams: {
      steps: 20,
      cfgScale: 7,
      sampler: "euler_a",
    },
  },
  {
    id: "seedream-4.5",
    name: "Seedream 4.5",
    provider: "kie.ai",
    category: "photo",
    apiId: "seedream-4.5",
    endpoint: "/v1/generate/image",
    logo: "/logos/seedream.svg",
    description: "Высокое качество и детализация",
    creditCost: 5,
    speed: "medium",
    quality: "ultra",
    bestFor: ["Финальные работы", "Детализация", "Реализм"],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:2"],
      maxResolution: "1536x1536",
    },
    defaultParams: {
      steps: 30,
      cfgScale: 7.5,
      sampler: "dpm++_2m",
    },
  },
  {
    id: "flux-2",
    name: "Flux.2",
    provider: "kie.ai",
    category: "photo",
    apiId: "flux-2",
    endpoint: "/v1/generate/image",
    logo: "/logos/flux.svg",
    description: "Флагманская модель для фотореализма",
    creditCost: 8,
    speed: "medium",
    quality: "ultra",
    bestFor: ["Фотореализм", "Портреты", "Продукты"],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "21:9"],
      maxResolution: "2048x2048",
    },
    defaultParams: {
      steps: 40,
      cfgScale: 8,
      sampler: "dpm++_sde",
    },
  },
  {
    id: "nano-banana-api",
    name: "Nano Banana API",
    provider: "kie.ai",
    category: "photo",
    apiId: "nano-banana-api",
    endpoint: "/v1/generate/image",
    logo: "/logos/nano-banana.svg",
    description: "API-оптимизированная версия для batch",
    creditCost: 2,
    speed: "fast",
    quality: "standard",
    bestFor: ["Batch генерация", "Автоматизация", "API"],
    capabilities: {
      textToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16"],
      maxResolution: "1024x1024",
    },
    defaultParams: {
      steps: 15,
      cfgScale: 6,
    },
  },
  {
    id: "seedream-api",
    name: "Seedream API",
    provider: "kie.ai",
    category: "photo",
    apiId: "seedream-api",
    endpoint: "/v1/generate/image",
    logo: "/logos/seedream.svg",
    description: "API версия с балансом качества и скорости",
    creditCost: 4,
    speed: "medium",
    quality: "high",
    bestFor: ["API интеграции", "Продакшн", "Стабильность"],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      maxResolution: "1536x1536",
    },
    defaultParams: {
      steps: 25,
      cfgScale: 7,
    },
  },
  {
    id: "z-image",
    name: "Z-Image",
    provider: "kie.ai",
    category: "photo",
    apiId: "z-image",
    endpoint: "/v1/generate/image",
    logo: "/logos/z-image.svg",
    description: "Специализированная модель для арта",
    creditCost: 6,
    speed: "medium",
    quality: "ultra",
    bestFor: ["Арт", "Иллюстрации", "Стилизация"],
    capabilities: {
      textToImage: true,
      imageToImage: true,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      maxResolution: "1536x1536",
    },
    defaultParams: {
      steps: 35,
      cfgScale: 8,
    },
  },
];

// ===== VIDEO MODELS =====

export const VIDEO_MODELS: AIModel[] = [
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "kie.ai",
    category: "video",
    apiId: "sora-2",
    endpoint: "/v1/generate/video",
    logo: "/logos/sora.svg",
    description: "Базовая версия Sora для видео",
    creditCost: 40,
    speed: "medium",
    quality: "high",
    bestFor: ["Короткие видео", "Концепты", "Тесты"],
    capabilities: {
      textToVideo: true,
      imageToVideo: true,
      aspectRatios: ["16:9", "9:16", "1:1"],
      maxResolution: "1280x720",
      maxDuration: 5,
    },
    defaultParams: {},
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    provider: "kie.ai",
    category: "video",
    apiId: "sora-2-pro",
    endpoint: "/v1/generate/video",
    logo: "/logos/sora.svg",
    description: "Продвинутая версия с лучшим качеством",
    creditCost: 60,
    speed: "slow",
    quality: "ultra",
    bestFor: ["Финальный контент", "Качество", "Реализм"],
    capabilities: {
      textToVideo: true,
      imageToVideo: true,
      aspectRatios: ["16:9", "9:16", "1:1", "21:9"],
      maxResolution: "1920x1080",
      maxDuration: 10,
    },
    defaultParams: {},
  },
  {
    id: "sora-2-pro-storyboard",
    name: "Sora 2 Pro Storyboard",
    provider: "kie.ai",
    category: "video",
    apiId: "sora-2-pro-storyboard",
    endpoint: "/v1/generate/video",
    logo: "/logos/sora.svg",
    description: "Для создания сториборд и планирования",
    creditCost: 50,
    speed: "medium",
    quality: "high",
    bestFor: ["Storyboard", "Планирование", "Превизуализация"],
    capabilities: {
      textToVideo: true,
      aspectRatios: ["16:9", "4:3"],
      maxResolution: "1280x720",
      maxDuration: 8,
    },
    defaultParams: {},
  },
  {
    id: "veo-3.1-api",
    name: "Veo 3.1 API",
    provider: "kie.ai",
    category: "video",
    apiId: "veo-3.1-api",
    endpoint: "/v1/generate/video",
    logo: "/logos/veo.svg",
    description: "Google Veo для реалистичной физики",
    creditCost: 70,
    speed: "slow",
    quality: "ultra",
    bestFor: ["Реалистичная физика", "Движение", "Детали"],
    capabilities: {
      textToVideo: true,
      imageToVideo: true,
      aspectRatios: ["16:9", "9:16", "1:1"],
      maxResolution: "1920x1080",
      maxDuration: 10,
    },
    defaultParams: {},
  },
  {
    id: "seedance-api",
    name: "Seedance API",
    provider: "kie.ai",
    category: "video",
    apiId: "seedance-api",
    endpoint: "/v1/generate/video",
    logo: "/logos/seedance.svg",
    description: "Быстрая генерация для batch",
    creditCost: 35,
    speed: "fast",
    quality: "standard",
    bestFor: ["Batch", "Быстрые варианты", "API"],
    capabilities: {
      textToVideo: true,
      aspectRatios: ["16:9", "9:16", "1:1"],
      maxResolution: "1280x720",
      maxDuration: 5,
    },
    defaultParams: {},
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    provider: "kie.ai",
    category: "video",
    apiId: "kling-2.6",
    endpoint: "/v1/generate/video",
    logo: "/logos/kling.svg",
    description: "Качественная генерация с аватарами",
    creditCost: 55,
    speed: "medium",
    quality: "ultra",
    bestFor: ["Аватары", "Lip Sync", "Персонажи"],
    capabilities: {
      textToVideo: true,
      imageToVideo: true,
      aspectRatios: ["16:9", "9:16", "1:1"],
      maxResolution: "1920x1080",
      maxDuration: 10,
    },
    defaultParams: {},
  },
];

// ===== PRODUCT MODELS =====

export const PRODUCT_MODELS: AIModel[] = [
  {
    id: "product-nano-banana",
    name: "Product Quick",
    provider: "kie.ai",
    category: "product",
    apiId: "nano-banana-pro",
    endpoint: "/v1/generate/image",
    logo: "/logos/nano-banana.svg",
    description: "Быстрая обработка товаров",
    creditCost: 3,
    speed: "fast",
    quality: "high",
    bestFor: ["Быстрая обработка", "Тесты", "Много товаров"],
    capabilities: {
      imageToImage: true,
      aspectRatios: ["1:1", "4:3", "3:2"],
      maxResolution: "1500x1500",
    },
    defaultParams: {
      steps: 20,
    },
  },
  {
    id: "product-flux",
    name: "Product Pro",
    provider: "kie.ai",
    category: "product",
    apiId: "flux-2",
    endpoint: "/v1/generate/image",
    logo: "/logos/flux.svg",
    description: "Максимальное качество для маркетплейсов",
    creditCost: 5,
    speed: "medium",
    quality: "ultra",
    bestFor: ["WB/Ozon", "Качество", "Финальные карточки"],
    capabilities: {
      imageToImage: true,
      aspectRatios: ["1:1", "4:3", "3:4"],
      maxResolution: "2000x2000",
    },
    defaultParams: {
      steps: 30,
    },
  },
];

// ===== ALL MODELS =====

export const ALL_MODELS: AIModel[] = [
  ...PHOTO_MODELS,
  ...VIDEO_MODELS,
  ...PRODUCT_MODELS,
];

// ===== HELPER FUNCTIONS =====

export const getModelsByCategory = (category: ContentType): AIModel[] => {
  switch (category) {
    case "photo":
      return PHOTO_MODELS;
    case "video":
      return VIDEO_MODELS;
    case "product":
      return PRODUCT_MODELS;
    default:
      return PHOTO_MODELS;
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
  return ALL_MODELS.filter((model) => model.speed === speed);
};

export const getModelsByQuality = (quality: "standard" | "high" | "ultra"): AIModel[] => {
  return ALL_MODELS.filter((model) => model.quality === quality);
};

export const getModelCreditCost = (modelId: string): number => {
  const model = getModelById(modelId);
  return model?.creditCost ?? 0;
};

// Для обратной совместимости
export const photoModels = PHOTO_MODELS;
export const videoModels = VIDEO_MODELS;
export const productModels = PRODUCT_MODELS;
export const allModels = ALL_MODELS;
export const getModelsByType = getModelsByCategory;