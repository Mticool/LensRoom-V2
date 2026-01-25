/**
 * Price computation: credits -> stars
 * Single source of truth for pricing calculations
 */

import { ModelConfig, PhotoModelConfig, VideoModelConfig, getModelById } from '@/config/models';

export interface PriceOptions {
  // Photo options
  quality?: string; // '1k', '2k', '4k', 'turbo', 'balanced', 'quality', 'fast', 'ultra', '1k_2k'
  resolution?: string; // '512x512', '1024x1024', '480p', '720p', '1080p' etc. (for video: '720p', '1080p')

  // Video options
  mode?: 't2v' | 'i2v' | 'start_end' | 'storyboard';
  duration?: number | string; // 5, 10, 15, or '15-25'
  videoQuality?: string; // '720p', '1080p', '480p', 'fast', 'quality', 'standard', 'high'
  audio?: boolean;
  modelVariant?: string; // For unified models like Kling/WAN: 'kling-2.5-turbo', 'wan-2.5', etc.

  // Kling quality tiers
  qualityTier?: 'standard' | 'pro' | 'master'; // Kling 2.6 quality tier

  // Common
  variants?: number; // Number of variants to generate
}

export interface ComputedPrice {
  credits: number; // Raw Kie credits
  stars: number; // Rounded up: ceil(credits)
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
  } else if (options.quality && options.resolution && model.provider === 'openai') {
    // OpenAI GPT Image 1.5: pricing by quality_size key
    const pricingKey = `${options.quality}_${options.resolution}`;
    creditsPerImage = model.pricing[pricingKey as keyof typeof model.pricing] as number || 0;
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
  
  return {
    credits: totalCredits,
    stars,
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

  // Auto-select Kling variant based on qualityTier
  let effectiveModelVariant = options.modelVariant;
  if (model.id === 'kling' && options.qualityTier && !effectiveModelVariant) {
    // Map qualityTier to variant ID
    const tierToVariant: Record<string, string> = {
      standard: 'kling-2.6-standard',
      pro: 'kling-2.6-pro',
      master: 'kling-2.6-master',
    };
    effectiveModelVariant = tierToVariant[options.qualityTier];
  }

  // If model has variants and modelVariant is specified, use variant pricing
  if (model.modelVariants && effectiveModelVariant) {
    const variant = model.modelVariants.find(v => v.id === effectiveModelVariant);
    if (variant) {
      // Check for per-second pricing (e.g., WAN 2.5)
      if (variant.perSecondPricing && options.resolution) {
        const perSecond = variant.perSecondPricing[options.resolution as keyof typeof variant.perSecondPricing];
        if (typeof perSecond === 'number') {
          const seconds = typeof duration === 'number' ? duration : 5;
          creditsPerVideo = perSecond * seconds;
        }
      } else {
        // Use fixed pricing structure
        const variantPricing = variant.pricing;
        if (typeof variantPricing === 'number') {
          const seconds = typeof duration === 'number' ? duration : 5;
          creditsPerVideo = variantPricing * seconds;
        } else if (options.resolution && variantPricing[options.resolution as keyof typeof variantPricing]) {
          // Resolution-based pricing (e.g., WAN 2.6: { "720p": { "5": 100, ... }, "1080p": { "5": 160, ... } })
          const resolutionPricing = variantPricing[options.resolution as keyof typeof variantPricing];
          if (typeof resolutionPricing === 'object' && resolutionPricing !== null) {
            const durationPrice = resolutionPricing[durationKey as keyof typeof resolutionPricing];
            if (typeof durationPrice === 'number') {
              creditsPerVideo = durationPrice;
            }
          }
        } else if (variantPricing[durationKey as keyof typeof variantPricing]) {
          const durationPricing = variantPricing[durationKey as keyof typeof variantPricing];
          if (typeof durationPricing === 'number') {
            creditsPerVideo = durationPricing;
          } else if (typeof durationPricing === 'object') {
            if (options.audio !== undefined) {
              creditsPerVideo = durationPricing[options.audio ? 'audio' : 'no_audio'] || 0;
            } else {
              creditsPerVideo = durationPricing['no_audio'] || Object.values(durationPricing)[0] as number || 0;
            }
          }
        } else {
          // Fallback to first available price
          const firstKey = Object.keys(variantPricing)[0];
          if (firstKey && variantPricing[firstKey as keyof typeof variantPricing]) {
            const firstPrice = variantPricing[firstKey as keyof typeof variantPricing];
            if (typeof firstPrice === 'number') {
              creditsPerVideo = firstPrice;
            } else if (typeof firstPrice === 'object' && firstPrice !== null) {
              const values = Object.values(firstPrice);
              creditsPerVideo = (values[0] as number) || 0;
            }
          }
        }
      }
    }
  }
  
  // If no variant pricing found, use model pricing
  if (creditsPerVideo === 0) {
    // Extract pricing
    if (typeof model.pricing === 'number') {
      // Price per second
      const seconds = typeof duration === 'number' ? duration : 5; // Default to 5 for ranges
      creditsPerVideo = model.pricing * seconds;
    } else if (options.resolution && model.pricing[options.resolution as keyof typeof model.pricing]) {
      // Resolution-based pricing (e.g., Bytedance, Kling AI Avatar, Motion Control)
      const resolutionPricing = model.pricing[options.resolution as keyof typeof model.pricing] as any;
      if (typeof resolutionPricing === 'object' && resolutionPricing !== null) {
        // Handle per-second pricing (e.g., Motion Control: { '720p': { perSecond: 16 } })
        if ('perSecond' in resolutionPricing && typeof resolutionPricing.perSecond === 'number') {
          const seconds = typeof duration === 'number' ? duration : 5;
          creditsPerVideo = resolutionPricing.perSecond * seconds;
          // Round up to nearest 5 for motion control style pricing
          creditsPerVideo = Math.ceil(creditsPerVideo / 5) * 5;
        } else {
          // Standard duration-based pricing
          const durationPrice = resolutionPricing[durationKey as keyof typeof resolutionPricing];
          if (typeof durationPrice === 'number') {
            creditsPerVideo = durationPrice;
          }
        }
      }
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
  }
  
  const totalCredits = creditsPerVideo * variants;
  const stars = Math.ceil(totalCredits);
  
  return {
    credits: totalCredits,
    stars,
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
    };
  }
  
  if (model.type === 'photo') {
    return computePhotoPrice(model, options);
  } else {
    return computeVideoPrice(model, options);
  }
}

// Single-source star helpers (UI + server validation)
export function calcStars(modelId: string, options: PriceOptions = {}): number {
  return computePrice(modelId, options).stars;
}
