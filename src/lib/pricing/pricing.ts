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

import {
  MOTION_CONTROL_LIMITS,
  calcMotionControlCredits,
  clampMotionControlSeconds,
  type MotionCharacterOrientation,
  type MotionControlResolution,
} from '@/lib/videoModels/motion-control';

export type { MotionCharacterOrientation, MotionControlResolution } from '@/lib/videoModels/motion-control';

export const PRICING_VERSION = "2026-02-06";

// ============================================================================
// SKU GENERATION
// ============================================================================

export interface PricingOptions {
  // Photo options
  quality?: string; // '1k', '2k', '4k', '1k_2k', 'medium', 'high', etc.
  resolution?: string; // '512x512', '1024x1024', etc.
  mode?: 't2i' | 'i2i' | 't2v' | 'i2v' | 'i2i_run' | 'extend' | 'start_end' | 'v2v' | 'motion_control';

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
 * Backward-compatible options shape used in legacy UI components.
 * Keep this interface here so all pricing imports come from one file.
 */
export interface PriceOptions {
  quality?: string;
  resolution?: string;
  mode?: 't2v' | 'i2v' | 'start_end' | 'storyboard' | 'extend' | 'v2v' | 'motion_control' | 't2i' | 'i2i' | 'i2i_run';
  duration?: number | string;
  videoQuality?: string;
  audio?: boolean;
  modelVariant?: string;
  qualityTier?: 'standard' | 'pro' | 'master';
  variants?: number;
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
 * - kling_ai_avatar_standard:per_sec
 * - kling_ai_avatar_pro:per_sec
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
    return 'nano_banana_pro:image';
  }

  if (normalizedModelId === 'seedream_4_5' || normalizedModelId === 'seedream_4_5_edit') {
    return 'seedream_4_5:image';
  }

  if (normalizedModelId === 'z_image') {
    return 'z_image:image';
  }

  if (normalizedModelId === 'gpt_image_1_5' || normalizedModelId === 'gpt_image') {
    const quality = options.quality || 'medium';
    if (quality === 'high') {
      return 'gpt_image_1_5:high';
    }
    return 'gpt_image_1_5:medium';
  }

  if (normalizedModelId === 'flux_2_pro') {
    const quality = options.quality || '1k';
    if (quality === '2k' || quality === '4k') {
      return 'flux_2_pro:2k';
    }
    return 'flux_2_pro:1k';
  }

  if (normalizedModelId === 'grok_imagine') {
    return 'grok_imagine:i2i_run';
  }

  if (normalizedModelId === 'z_image' || normalizedModelId === 'z_image_turbo') {
    return 'z_image:image';
  }

  if (normalizedModelId === 'recraft_remove_background') {
    return 'recraft_remove_background:image';
  }

  if (normalizedModelId === 'topaz_image_upscale') {
    const q = String(options.quality || options.resolution || '').toLowerCase();
    if (q === '8k' || q === '8') return 'topaz_image_upscale:8k';
    if (q === '4k' || q === '4') return 'topaz_image_upscale:4k';
    return 'topaz_image_upscale:2k';
  }

  if (normalizedModelId === 'ideogram_v3') {
    return 'ideogram_v3:image';
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
    const duration = options.duration === 10 ? 10 : 6;
    return `grok_video:${duration}s`;
  }

  // Kling 2.6
  if (normalizedModelId === 'kling_2_6' || 
      (normalizedModelId === 'kling' && options.modelVariant?.includes('2.6'))) {
    const duration = options.duration || 5;
    const hasAudio = options.audio === true;
    const audioSuffix = hasAudio ? 'audio' : 'no_audio';
    return `kling_2_6:${duration}s:${audioSuffix}`;
  }

  // Kling O1 Standard
  if (normalizedModelId === 'kling_o1') {
    const duration = options.duration || 5;
    return `kling_o1:${duration}s`;
  }

  // Kling O3 Standard (temporary parity pricing, feature-flagged rollout)
  if (normalizedModelId === 'kling_o3_standard') {
    const duration = options.duration || 5;
    const hasAudio = options.audio === true;
    const audioSuffix = hasAudio ? 'audio' : 'no_audio';
    return `kling_o3_standard:${duration}s:${audioSuffix}`;
  }

  // Kling 2.5
  if (normalizedModelId === 'kling_2_5' || 
      (normalizedModelId === 'kling' && options.modelVariant?.includes('2.5'))) {
    const duration = options.duration || 5;
    return `kling_2_5:${duration}s`;
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
    const resolution = options.videoQuality || options.resolution || '720p';
    const duration = options.duration || 5;
    return `wan_2_6:${resolution}:${duration}s`;
  }

  // Kling Motion Control (per second)
  if (normalizedModelId === 'kling_motion_control' || options.isMotionControl) {
    const resolution = options.videoQuality || '720p';
    return `kling_motion_control:${resolution}:per_sec`;
  }

  // === LIP SYNC MODELS ===

  // Kling AI Avatar (per-second pricing)
  if (normalizedModelId === 'kling_ai_avatar' || normalizedModelId === 'kling_ai_avatar_standard') {
    return 'kling_ai_avatar_standard:per_sec';
  }

  if (normalizedModelId === 'kling_ai_avatar_pro') {
    return 'kling_ai_avatar_pro:per_sec';
  }

  // InfiniteTalk (per-second pricing) - duration from options.audioDurationSec
  if (normalizedModelId === 'infinitalk_480p') {
    return 'infinitalk_480p:per_sec';
  }

  if (normalizedModelId === 'infinitalk_720p') {
    return 'infinitalk_720p:per_sec';
  }

  // === WAN ANIMATE MODELS (per-second pricing) ===

  if (normalizedModelId === 'wan_animate_move') {
    return 'wan_animate_move:per_sec';
  }

  if (normalizedModelId === 'wan_animate_replace') {
    return 'wan_animate_replace:per_sec';
  }

  // Kling O1 Edit (fixed pricing by duration)
  if (normalizedModelId === 'kling_o1_edit') {
    const duration = options.duration || 5;
    return `kling_o1_edit:${duration}s`;
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
  'nano_banana:image': 5,
  'nano_banana_pro:image': 9,
  'seedream_4_5:image': 6,
  'z_image:image': 1,
  'recraft_remove_background:image': 1,
  'topaz_image_upscale:2k': 9,
  'topaz_image_upscale:4k': 17,
  'topaz_image_upscale:8k': 34,
  'gpt_image_1_5:medium': 4,
  'gpt_image_1_5:high': 19,
  'flux_2_pro:1k': 5,
  'flux_2_pro:2k': 6,
  'grok_imagine:i2i_run': 4,
  // Model exists as optional/feature-flagged in UI; keep explicit price in single table.
  'ideogram_v3:image': 6,

  // === VIDEO MODELS (FIXED) ===
  'veo_3_1_fast:clip': 26,
  'veo_3_1_fast:extend': 26,
  'sora_2:clip': 26,
  'grok_video:6s': 17,
  'grok_video:10s': 26,

  // === VIDEO MODELS (VARIANTS) ===

  // KLING 2.6
  'kling_2_6:5s:no_audio': 48,
  'kling_2_6:10s:no_audio': 94,
  'kling_2_6:5s:audio': 94,
  'kling_2_6:10s:audio': 187,

  // KLING 2.5
  'kling_2_5:5s': 36,
  'kling_2_5:10s': 72,

  // KLING O3 STANDARD (TEMPORARY parity, calibrate after real-cost data)
  'kling_o3_standard:3s:no_audio': 30,
  'kling_o3_standard:3s:audio': 45,
  'kling_o3_standard:5s:no_audio': 50,
  'kling_o3_standard:5s:audio': 75,
  'kling_o3_standard:8s:no_audio': 80,
  'kling_o3_standard:8s:audio': 120,
  'kling_o3_standard:10s:no_audio': 100,
  'kling_o3_standard:10s:audio': 150,
  'kling_o3_standard:12s:no_audio': 120,
  'kling_o3_standard:12s:audio': 180,
  'kling_o3_standard:15s:no_audio': 150,
  'kling_o3_standard:15s:audio': 225,

  // KLING O1 STANDARD
  'kling_o1:5s': 56,
  'kling_o1:10s': 112,

  // KLING 2.1 (TIER)
  'kling_2_1:standard:5s': 22,
  'kling_2_1:standard:10s': 43,
  'kling_2_1:pro:5s': 43,
  'kling_2_1:pro:10s': 85,
  'kling_2_1:master:5s': 136,
  'kling_2_1:master:10s': 272,

  // WAN 2.6
  'wan_2_6:720p:5s': 60,
  'wan_2_6:720p:10s': 119,
  'wan_2_6:720p:15s': 179,
  'wan_2_6:1080p:5s': 91,
  'wan_2_6:1080p:10s': 179,
  'wan_2_6:1080p:15s': 269,

  // KLING MOTION CONTROL (PER SECOND)
  'kling_motion_control:720p:per_sec': 6,
  'kling_motion_control:1080p:per_sec': 9,

  // === LIP SYNC MODELS ===
  
  // KLING AI AVATAR (PER SECOND)
  'kling_ai_avatar_standard:per_sec': 8,
  'kling_ai_avatar_pro:per_sec': 16,
  // Legacy fixed SKU (kept for backward compatibility with historical rows)
  'kling_ai_avatar:standard': 50,

  // INFINITALK (PER SECOND)
  'infinitalk_480p:per_sec': 3,
  'infinitalk_720p:per_sec': 12,

  // === WAN ANIMATE (PER SECOND) ===
  'wan_animate_move:per_sec': 6,     // Motion Transfer — 6⭐/сек
  'wan_animate_replace:per_sec': 8,  // Character Swap — 8⭐/сек

  // === KLING O3 EDIT (FIXED PRICING BY DURATION) ===
  'kling_o1_edit:5s': 75,
  'kling_o1_edit:10s': 150,
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
    const duration = Math.max(1, Math.ceil(Number(durationSec || 5))); // Default to 5s if not specified
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

function toPricingOptions(options: PriceOptions): PricingOptions {
  const parsedDuration =
    typeof options.duration === 'number'
      ? options.duration
      : Number.isFinite(Number(options.duration))
        ? Number(options.duration)
        : undefined;

  return {
    quality: options.quality,
    resolution: options.resolution,
    mode: options.mode as PricingOptions['mode'],
    duration: parsedDuration,
    videoQuality: options.videoQuality,
    audio: options.audio,
    modelVariant: options.modelVariant,
    qualityTier: options.qualityTier,
    isMotionControl: options.mode === 'motion_control',
  };
}

/**
 * Backward-compatible compute function.
 * Prefer `getSkuFromRequest` + `calculateTotalStars` in new code.
 */
export function computePrice(modelId: string, options: PriceOptions = {}): ComputedPrice {
  const pricingOptions = toPricingOptions(options);
  const base = computePriceV2(modelId, pricingOptions);
  const variants = Math.max(1, Number(options.variants || 1));

  return {
    credits: base.credits * variants,
    stars: base.stars * variants,
    sku: base.sku,
    pricingVersion: base.pricingVersion,
  };
}

export function calcStars(modelId: string, options: PriceOptions = {}): number {
  return computePrice(modelId, options).stars;
}

// ============================================================================
// MOTION CONTROL HELPERS
// ============================================================================

export const MOTION_CONTROL_CONFIG = {
  MIN_DURATION_SEC: MOTION_CONTROL_LIMITS.minSeconds,
  MAX_DURATION_SEC: MOTION_CONTROL_LIMITS.maxSeconds,
  RATE_720P: MOTION_CONTROL_LIMITS.creditsPerSecond['720p'],
  RATE_1080P: MOTION_CONTROL_LIMITS.creditsPerSecond['1080p'],
  ROUND_TO: 1,
} as const;

export function validateMotionControlDuration(durationSec: number, autoTrim: boolean) {
  const d = Number(durationSec || 0);

  if (!Number.isFinite(d) || d <= 0) {
    return { valid: false, error: 'Укажите длительность видео' as const };
  }

  if (d < MOTION_CONTROL_CONFIG.MIN_DURATION_SEC) {
    return {
      valid: false,
      error: `Минимум ${MOTION_CONTROL_CONFIG.MIN_DURATION_SEC} сек` as const,
    };
  }

  if (d > MOTION_CONTROL_CONFIG.MAX_DURATION_SEC) {
    if (!autoTrim) {
      return {
        valid: false,
        error: `Максимум ${MOTION_CONTROL_CONFIG.MAX_DURATION_SEC} сек` as const,
      };
    }
    return {
      valid: true,
      effectiveDuration: MOTION_CONTROL_CONFIG.MAX_DURATION_SEC,
      trimmed: true,
      originalDuration: d,
    };
  }

  return {
    valid: true,
    effectiveDuration: d,
    trimmed: false,
    originalDuration: d,
  };
}

export function calcMotionControlStars(
  durationSec: number,
  resolution: MotionControlResolution,
  autoTrim: boolean,
  orientation: MotionCharacterOrientation = 'video'
): number | null {
  const validation = validateMotionControlDuration(durationSec, autoTrim);
  if (!validation.valid) return null;

  const effective = clampMotionControlSeconds(Number(validation.effectiveDuration || 0), orientation);
  const { credits } = calcMotionControlCredits(effective, resolution, orientation);
  return Math.max(0, credits);
}
