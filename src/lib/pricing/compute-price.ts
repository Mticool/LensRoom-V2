/**
 * Backward-compatible wrapper.
 * Single source of truth: src/lib/pricing/pricing.ts
 */

import { computePriceV2, type PricingOptions } from '@/lib/pricing/pricing';

export interface PriceOptions {
  quality?: string;
  resolution?: string;
  mode?: 't2v' | 'i2v' | 'start_end' | 'storyboard' | 'extend' | 'v2v' | 'motion_control';
  duration?: number | string;
  videoQuality?: string;
  audio?: boolean;
  modelVariant?: string;
  qualityTier?: 'standard' | 'pro' | 'master';
  variants?: number;
}

export interface ComputedPrice {
  credits: number;
  stars: number;
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

export function computePrice(modelId: string, options: PriceOptions = {}): ComputedPrice {
  const pricingOptions = toPricingOptions(options);
  const base = computePriceV2(modelId, pricingOptions);
  const variants = Math.max(1, Number(options.variants || 1));

  return {
    credits: base.credits * variants,
    stars: base.stars * variants,
  };
}

export function calcStars(modelId: string, options: PriceOptions = {}): number {
  return computePrice(modelId, options).stars;
}
