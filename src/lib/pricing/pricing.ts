/**
 * SINGLE SOURCE OF TRUTH FOR PRICING (2026-01-27)
 * 
 * All prices are in STARS (⭐). Do NOT convert from RUB/USD/credits.
 * This is the atomic pricing system used everywhere: UI, backend, ledger.
 * 
 * Flow:
 * 1. Call getSkuFromRequest(modelId, options) to get SKU string
 * 2. Call getPriceStars(sku) to get exact star price
 * 3. Deduct that exact amount from user balance
 * 4. Store: sku, priceStars, pricingVersion in ledger + generation record
 */

export const PRICING_VERSION = "2026-01-27";

// ============================================================================
// SKU GENERATION
// ============================================================================

export interface PricingOptions {
  // Photo options
  quality?: string; // '1k', '2k', '4k', '1k_2k', 'medium', 'high', etc.
  resolution?: string; // '512x512', '1024x1024', etc.
  mode?: 't2i' | 'i2i' | 't2v' | 'i2v' | 'i2i_run' | 'extend' | 'start_end' | 'v2v';

  // Video options
  duration?: number; // 5, 6, 10, 15, etc.
  videoQuality?: string; // '720p', '1080p'
  audio?: boolean; // true = with audio, false = no audio
  modelVariant?: string; // For unified models: 'kling-2.6', 'kling-2.5', etc.
  qualityTier?: 'standard' | 'pro' | 'master'; // Kling 2.1 tiers

  // Motion control (per second pricing)
  isMotionControl?: boolean;

  // Lip sync: audio duration in seconds (for per-second pricing)
  audioDurationSec?: number;
}

/**
 * Generate SKU from model ID and options
 * 
 * SKU format examples:
 * - nano_banana:image
 * - nano_banana_pro:2k
 * - nano_banana_pro:4k
 * - flux_2_pro:1k
 * - flux_2_pro:2k
 * - kling_2_6:5s:720p:no_audio
 * - kling_2_6:10s:1080p:audio
 * - kling_2_5:5s:720p
 * - kling_2_1:standard:5s
 * - wan_2_6:720p:5s
 * - veo_3_1_fast:clip
 * - kling_motion_control:720p:per_sec
 * - kling_ai_avatar:standard
 * - infinitalk_480p:per_sec
 * - infinitalk_720p:per_sec
 */
export function getSkuFromRequest(modelId: string, options: PricingOptions = {}): string {
  // Replace both dashes and dots with underscores (e.g., veo-3.1-fast → veo_3_1_fast)
  const normalizedModelId = modelId.replace(/[-\.]/g, '_');

  // === PHOTO MODELS ===
  if (normalizedModelId === 'nano_banana') {
    return 'nano_banana:image';
  }

  if (normalizedModelId === 'nano_banana_pro') {
    const quality = options.quality || '1k_2k';
    if (quality === '4k') {
      return 'nano_banana_pro:4k';
    }
    // Default: 1k or 2k
    return 'nano_banana_pro:2k';
  }

  if (normalizedModelId === 'seedream_4_5' || normalizedModelId === 'seedream_4_5_edit') {
    return 'seedream_4_5:image';
  }

  if (normalizedModelId === 'z_image') {
    return 'z_image:image';
  }

  if (normalizedModelId === 'gpt_image_1_5') {
    const quality = options.quality || 'medium';
    if (quality === 'high') {
      return 'gpt_image_1_5:high';
    }
    return 'gpt_image_1_5:medium';
  }

  if (normalizedModelId === 'flux_2_pro') {
    const quality = options.quality || '1k';
    if (quality === '2k') {
      return 'flux_2_pro:2k';
    }
    return 'flux_2_pro:1k';
  }

  if (normalizedModelId === 'grok_imagine') {
    return 'grok_imagine:i2i_run';
  }

  // === VIDEO MODELS ===

  // Veo 3.1 (Fast/Quality/legacy IDs)
  if (
    normalizedModelId === 'veo_3_1_fast' ||
    normalizedModelId === 'veo_3_1' ||
    normalizedModelId === 'veo_3_1_quality' ||
    normalizedModelId === 'veo'
  ) {
    // Extend mode (продление видео)
    if (options.mode === 'extend') {
      return 'veo_3_1_fast:extend';
    }
    return 'veo_3_1_fast:clip';
  }

  // Sora 2
  if (normalizedModelId === 'sora_2' || normalizedModelId === 'sora') {
    return 'sora_2:clip';
  }

  // Grok Video
  if (normalizedModelId === 'grok_video') {
    return 'grok_video:6s';
  }

  // Kling 2.6
  if (normalizedModelId === 'kling_2_6' || 
      (normalizedModelId === 'kling' && options.modelVariant?.includes('2.6'))) {
    const duration = options.duration || 5;
    const resolution = options.videoQuality || '720p';
    const hasAudio = options.audio === true;

    // Special case: 10s 1080p with audio
    if (duration === 10 && resolution === '1080p' && hasAudio) {
      // Not in pricing table - use closest (10s 720p audio = 367)
      // Actually user didn't provide this, so we'll skip it
    }

    const audioSuffix = hasAudio ? 'audio' : 'no_audio';
    return `kling_2_6:${duration}s:${resolution}:${audioSuffix}`;
  }

  // Kling 2.5
  if (normalizedModelId === 'kling_2_5' || 
      (normalizedModelId === 'kling' && options.modelVariant?.includes('2.5'))) {
    const duration = options.duration || 5;
    const resolution = options.videoQuality || '720p';
    return `kling_2_5:${duration}s:${resolution}`;
  }

  // Kling 2.1 (tier-based)
  if (normalizedModelId === 'kling_2_1' || 
      (normalizedModelId === 'kling' && options.modelVariant?.includes('2.1'))) {
    const tier = options.qualityTier || 'standard';
    const duration = options.duration || 5;
    return `kling_2_1:${tier}:${duration}s`;
  }

  // WAN 2.6
  if (normalizedModelId === 'wan_2_6' || 
      (normalizedModelId === 'wan' && options.modelVariant?.includes('2.6'))) {
    const resolution = options.videoQuality || '720p';
    const duration = options.duration || 5;
    return `wan_2_6:${resolution}:${duration}s`;
  }

  // Kling Motion Control (per second)
  if (normalizedModelId === 'kling_motion_control' || options.isMotionControl) {
    const resolution = options.videoQuality || '720p';
    return `kling_motion_control:${resolution}:per_sec`;
  }

  // === LIP SYNC MODELS ===

  // Kling AI Avatar (fixed price)
  if (normalizedModelId === 'kling_ai_avatar') {
    return 'kling_ai_avatar:standard';
  }

  // InfiniteTalk (per-second pricing) - duration from options.audioDurationSec
  if (normalizedModelId === 'infinitalk_480p') {
    return 'infinitalk_480p:per_sec';
  }

  if (normalizedModelId === 'infinitalk_720p') {
    return 'infinitalk_720p:per_sec';
  }

  // Fallback: unknown model
  console.warn(`[Pricing] Unknown model: ${modelId}, returning 0 stars`);
  return `unknown:${normalizedModelId}`;
}

// ============================================================================
// PRICE TABLES (STARS)
// ============================================================================

const PRICE_TABLE: Record<string, number> = {
  // === IMAGE MODELS ===
  'nano_banana:image': 9,
  'nano_banana_pro:2k': 17,
  'nano_banana_pro:4k': 25,
  'seedream_4_5:image': 10,
  'z_image:image': 5,
  'gpt_image_1_5:medium': 5,
  'gpt_image_1_5:high': 35,
  'flux_2_pro:1k': 10,
  'flux_2_pro:2k': 12,
  'grok_imagine:i2i_run': 5,

  // === VIDEO MODELS (FIXED) ===
  'veo_3_1_fast:clip': 50,
  'veo_3_1_fast:extend': 60, // Продление видео Veo 3.1
  'sora_2:clip': 50,
  'grok_video:6s': 34,

  // === VIDEO MODELS (VARIANTS) ===

  // KLING 2.6
  'kling_2_6:5s:720p:no_audio': 92,
  'kling_2_6:10s:720p:no_audio': 184,
  'kling_2_6:5s:720p:audio': 184,
  'kling_2_6:10s:720p:audio': 367,
  'kling_2_6:5s:1080p:no_audio': 139,
  'kling_2_6:10s:1080p:no_audio': 277,

  // KLING 2.5
  'kling_2_5:5s:720p': 70,
  'kling_2_5:10s:720p': 140,
  'kling_2_5:5s:1080p': 105,
  'kling_2_5:10s:1080p': 210,

  // KLING 2.1 (TIER)
  'kling_2_1:standard:5s': 42,
  'kling_2_1:standard:10s': 84,
  'kling_2_1:pro:5s': 84,
  'kling_2_1:pro:10s': 167,
  'kling_2_1:master:5s': 267,
  'kling_2_1:master:10s': 534,

  // WAN 2.6
  'wan_2_6:720p:5s': 117,
  'wan_2_6:720p:10s': 234,
  'wan_2_6:720p:15s': 350,
  'wan_2_6:1080p:5s': 234,
  'wan_2_6:1080p:10s': 467,
  'wan_2_6:1080p:15s': 700,

  // KLING MOTION CONTROL (PER SECOND)
  'kling_motion_control:720p:per_sec': 10,
  'kling_motion_control:1080p:per_sec': 20,

  // === LIP SYNC MODELS ===
  
  // KLING AI AVATAR (FIXED)
  'kling_ai_avatar:standard': 50,

  // INFINITALK (PER SECOND)
  'infinitalk_480p:per_sec': 3,
  'infinitalk_720p:per_sec': 12,
};

/**
 * Get price in stars for a SKU
 * 
 * For motion control (per_sec), multiply by duration after calling this.
 * 
 * @throws Error if SKU is not found (fail hard)
 */
export function getPriceStars(sku: string): number {
  const price = PRICE_TABLE[sku];
  
  if (price === undefined) {
    // FAIL HARD: undefined pricing is a critical error
    throw new Error(`[Pricing] No price defined for SKU: ${sku}. All SKUs must have explicit pricing.`);
  }
  
  return price;
}

/**
 * Check if a SKU is per-second pricing (motion control)
 */
export function isPerSecondSku(sku: string): boolean {
  return sku.includes(':per_sec');
}

/**
 * Calculate total stars for a generation
 * Handles per-second pricing for motion control
 */
export function calculateTotalStars(sku: string, durationSec?: number): number {
  const basePrice = getPriceStars(sku);
  
  if (isPerSecondSku(sku)) {
    const duration = durationSec || 5; // Default to 5s if not specified
    return basePrice * duration;
  }
  
  return basePrice;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get all SKUs (for debugging/testing)
 */
export function getAllSkus(): string[] {
  return Object.keys(PRICE_TABLE);
}

/**
 * Validate that a model/options combination has pricing
 */
export function validatePricing(modelId: string, options: PricingOptions = {}): {
  valid: boolean;
  sku: string;
  stars: number;
  error?: string;
} {
  try {
    const sku = getSkuFromRequest(modelId, options);
    const stars = calculateTotalStars(sku, options.duration);
    
    return {
      valid: true,
      sku,
      stars,
    };
  } catch (error) {
    return {
      valid: false,
      sku: '',
      stars: 0,
      error: error instanceof Error ? error.message : 'Unknown pricing error',
    };
  }
}

// ============================================================================
// BACKWARDS COMPATIBILITY
// ============================================================================

/**
 * Legacy computePrice interface for gradual migration
 * Returns same shape as old compute-price.ts
 */
export interface ComputedPrice {
  credits: number; // For backwards compatibility (same as stars)
  stars: number;
  sku?: string;
  pricingVersion?: string;
}

export function computePriceV2(modelId: string, options: PricingOptions = {}): ComputedPrice {
  const sku = getSkuFromRequest(modelId, options);
  const stars = calculateTotalStars(sku, options.duration);
  
  return {
    credits: stars, // Legacy field
    stars,
    sku,
    pricingVersion: PRICING_VERSION,
  };
}
