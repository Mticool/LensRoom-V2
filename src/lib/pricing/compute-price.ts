/**
 * Price computation: credits -> stars -> ₽
 * Single source of truth for pricing calculations
 */

import { ModelConfig, PhotoModelConfig, VideoModelConfig, getModelById } from '@/config/models';
import { STAR_PACKS, packTotalStars } from '@/config/pricing';

export interface PriceOptions {
  // Photo options
  quality?: string; // '1k', '2k', '4k', 'turbo', 'balanced', 'quality', 'fast', 'ultra', '1k_2k'
  resolution?: string; // '512x512', '1024x1024', '480p', '720p', '1080p' etc.
  
  // Video options
  mode?: 't2v' | 'i2v' | 'start_end' | 'storyboard';
  duration?: number | string; // 5, 10, 15, or '15-25'
  videoQuality?: string; // '720p', '1080p', '480p', 'fast', 'quality', 'standard', 'high'
  audio?: boolean;
  
  // Common
  variants?: number; // Number of variants to generate
}

export interface ComputedPrice {
  credits: number; // Raw Kie credits
  stars: number; // Rounded up: ceil(credits)
  approxRub: number; // Approximate price in RUB (based on current plan)
}

/**
 * Get current user's plan price per credit (if available)
 * Falls back to default (max pack)
 */
function getRubPerCredit(): number {
  // TODO: Get from user's current subscription/plan
  // For now, use the best deal (best ⭐ per ₽)
  const bestDeal = STAR_PACKS.reduce((best, current) => {
    const bestPrice = best.price / packTotalStars(best); // ₽ per ⭐
    const currentPrice = current.price / packTotalStars(current);
    return currentPrice < bestPrice ? current : best;
  });

  return bestDeal.price / packTotalStars(bestDeal); // ₽ per ⭐
}

/**
 * Compute price for a photo model
 */
function computePhotoPrice(
  model: PhotoModelConfig,
  options: PriceOptions
): ComputedPrice {
  const variants = options.variants || 1;
  let creditsPerImage = 0;
  
  // Extract pricing
  if (typeof model.pricing === 'number') {
    creditsPerImage = model.pricing;
  } else if (options.quality && model.pricing[options.quality as keyof typeof model.pricing]) {
    creditsPerImage = model.pricing[options.quality as keyof typeof model.pricing] as number;
  } else if (options.resolution && model.pricing[options.resolution as keyof typeof model.pricing]) {
    creditsPerImage = model.pricing[options.resolution as keyof typeof model.pricing] as number;
  } else {
    // Fallback to first available price
    const firstPrice = Object.values(model.pricing)[0];
    creditsPerImage = typeof firstPrice === 'number' ? firstPrice : 0;
  }
  
  const totalCredits = creditsPerImage * variants;
  const stars = Math.ceil(totalCredits);
  const rubPerCredit = getRubPerCredit();
  const approxRub = Math.round(stars * rubPerCredit);
  
  return {
    credits: totalCredits,
    stars,
    approxRub,
  };
}

/**
 * Compute price for a video model
 */
function computeVideoPrice(
  model: VideoModelConfig,
  options: PriceOptions
): ComputedPrice {
  const variants = options.variants || 1;
  let creditsPerVideo = 0;
  
  const duration = options.duration || model.fixedDuration || 5;
  const durationKey = String(duration);
  
  // Extract pricing
  if (typeof model.pricing === 'number') {
    // Price per second
    const seconds = typeof duration === 'number' ? duration : 5; // Default to 5 for ranges
    creditsPerVideo = model.pricing * seconds;
  } else if (options.videoQuality && model.pricing[options.videoQuality as keyof typeof model.pricing]) {
    const qualityPricing = model.pricing[options.videoQuality as keyof typeof model.pricing] as { [key: string]: number };
    creditsPerVideo = qualityPricing[durationKey] || qualityPricing[String(model.fixedDuration || 5)] || 0;
  } else if (options.mode && model.pricing[options.mode as keyof typeof model.pricing]) {
    // Pricing keyed by mode (e.g. storyboard)
    const modePricing = model.pricing[options.mode as keyof typeof model.pricing] as { [key: string]: number };
    creditsPerVideo = modePricing[durationKey] || modePricing[String(model.fixedDuration || 5)] || 0;
  } else if (model.pricing[durationKey as keyof typeof model.pricing]) {
    const durationPricing = model.pricing[durationKey as keyof typeof model.pricing];
    if (typeof durationPricing === 'number') {
      creditsPerVideo = durationPricing;
    } else if (typeof durationPricing === 'object') {
      // Handle audio/no_audio options (e.g., Kling)
      if (options.audio !== undefined) {
        creditsPerVideo = durationPricing[options.audio ? 'audio' : 'no_audio'] || 0;
      } else {
        // Default to no_audio
        creditsPerVideo = durationPricing['no_audio'] || Object.values(durationPricing)[0] as number || 0;
      }
    }
  } else {
    // Fallback to first available price
    const firstQuality = Object.keys(model.pricing)[0];
    if (firstQuality && model.pricing[firstQuality as keyof typeof model.pricing]) {
      const qualityPricing = model.pricing[firstQuality as keyof typeof model.pricing] as { [key: string]: number };
      creditsPerVideo = Object.values(qualityPricing)[0] as number || 0;
    }
  }
  
  const totalCredits = creditsPerVideo * variants;
  const stars = Math.ceil(totalCredits);
  const rubPerCredit = getRubPerCredit();
  const approxRub = Math.round(stars * rubPerCredit);
  
  return {
    credits: totalCredits,
    stars,
    approxRub,
  };
}

/**
 * Main function: compute price for any model
 */
export function computePrice(
  modelId: string,
  options: PriceOptions = {}
): ComputedPrice {
  const model = getModelById(modelId);
  
  if (!model) {
    return {
      credits: 0,
      stars: 0,
      approxRub: 0,
    };
  }
  
  if (model.type === 'photo') {
    return computePhotoPrice(model, options);
  } else {
    return computeVideoPrice(model, options);
  }
}

/**
 * Format price for display
 */
export function formatPriceDisplay(price: ComputedPrice): {
  stars: string;
  rub: string;
  full: string;
} {
  return {
    stars: `${price.stars}⭐`,
    rub: `≈${price.approxRub}₽`,
    full: `Стоимость: ${price.stars}⭐`,
  };
}

// Single-source star helpers (UI + server validation)
export function calcStars(modelId: string, options: PriceOptions = {}): number {
  return computePrice(modelId, options).stars;
}

export function calcApproxRub(modelId: string, options: PriceOptions = {}): number {
  return computePrice(modelId, options).approxRub;
}


