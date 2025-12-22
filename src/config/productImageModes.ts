// ===== PRODUCT IMAGE GENERATION MODES =====
// Pricing in stars (internal currency)

export interface ProductImageMode {
  id: string;
  name: string;
  modelKey: string;
  description: string;
  costPerImageStars: number;
  packCostStars: number; // Cost for default pack (6 slides)
  badge?: string;
  featured?: boolean;
}

// Default pack size
export const PACK_SLIDES_DEFAULT = 6;

// ===== MODES =====

export const PRODUCT_IMAGE_MODES: ProductImageMode[] = [
  {
    id: "standard",
    name: "Студия (FLUX.2)",
    modelKey: "flux-2",
    description: "Чистая студийная картинка, стабильный реализм",
    costPerImageStars: 9, // Updated to match FLUX.2 Pro 1k pricing
    packCostStars: 51, // ~6% discount vs 9*6=54
    featured: true,
  },
  {
    id: "premium",
    name: "Премиум (Nano Banana Pro)",
    modelKey: "nano-banana-pro",
    description: "Дорогой свет, глянец, премиальная подача",
    costPerImageStars: 30, // Updated to match Nano Banana Pro 1k_2k pricing
    packCostStars: 165, // ~8% discount vs 30*6=180
    badge: "PRO",
  },
  {
    id: "lifestyle",
    name: "Лайфстайл (Seedream 4.5)",
    modelKey: "seedream-4.5",
    description: "Товар в окружении (кухня/ванная/спортзал и т.д.)",
    costPerImageStars: 11, // Updated to match Seedream 4.5 pricing
    packCostStars: 63, // ~5% discount vs 11*6=66
  },
];

// ===== HELPERS =====

/**
 * Get mode by ID
 */
export function getModeById(modeId: string): ProductImageMode | undefined {
  return PRODUCT_IMAGE_MODES.find((mode) => mode.id === modeId);
}

/**
 * Get default mode (first in array)
 */
export function getDefaultMode(): ProductImageMode {
  return PRODUCT_IMAGE_MODES[0];
}

/**
 * Get cost for single image generation
 */
export function getSingleCost(modeId: string): number {
  const mode = getModeById(modeId);
  return mode?.costPerImageStars ?? PRODUCT_IMAGE_MODES[0].costPerImageStars;
}

/**
 * Get cost for pack generation
 * Uses pack discount for default pack size, otherwise calculates per-image
 */
export function getPackCost(modeId: string, slidesCount: number = PACK_SLIDES_DEFAULT): number {
  const mode = getModeById(modeId);
  if (!mode) {
    return PRODUCT_IMAGE_MODES[0].packCostStars;
  }

  // Use pack discount only for default pack size
  if (slidesCount === PACK_SLIDES_DEFAULT) {
    return mode.packCostStars;
  }

  // For custom sizes, calculate per-image cost (no discount)
  return Math.ceil(mode.costPerImageStars * slidesCount);
}

/**
 * Calculate savings when using pack vs single images
 */
export function getPackSavings(modeId: string): number {
  const mode = getModeById(modeId);
  if (!mode) return 0;

  const singleTotal = mode.costPerImageStars * PACK_SLIDES_DEFAULT;
  const packTotal = mode.packCostStars;

  return singleTotal - packTotal;
}

/**
 * Get savings percentage
 */
export function getPackSavingsPercent(modeId: string): number {
  const mode = getModeById(modeId);
  if (!mode) return 0;

  const singleTotal = mode.costPerImageStars * PACK_SLIDES_DEFAULT;
  const savings = getPackSavings(modeId);

  return Math.round((savings / singleTotal) * 100);
}

// ===== MODEL KEY MAPPING =====
// Maps our mode modelKey to actual KIE API model IDs

export const MODEL_KEY_TO_API_ID: Record<string, string> = {
  "flux-2": "flux-2", // Note: May need subscription upgrade
  "nano-banana-pro": "nano-banana-pro",
  "seedream-4.5": "seedream/4.5-text-to-image",
};

/**
 * Get KIE API model ID from mode's modelKey
 */
export function getApiModelId(modelKey: string): string {
  return MODEL_KEY_TO_API_ID[modelKey] ?? modelKey;
}


