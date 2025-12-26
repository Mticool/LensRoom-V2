'use client';

import { useMemo } from 'react';
import { GeneratorMode, GenerationSettings } from '../GeneratorV2';
import { computePrice, ComputedPrice } from '@/lib/pricing/compute-price';

interface CostCalculationResult {
  stars: number;
  credits: number;
  approxRub: number;
  breakdown?: string;
  isIncludedInPlan?: boolean;
}

/**
 * Calculate the cost in stars for a generation based on model and settings
 * Uses the centralized computePrice function (same as API)
 */
export function calculateGenerationCost(
  mode: GeneratorMode,
  settings: GenerationSettings
): CostCalculationResult {
  const modelId = settings.model;
  
  // Build price options matching API format
  const priceOptions: Parameters<typeof computePrice>[1] = {
    variants: 1,
  };

  if (mode === 'image') {
    // Photo options
    if (settings.quality) priceOptions.quality = settings.quality;
    if (settings.resolution) priceOptions.resolution = settings.resolution;
  } else {
    // Video options
    priceOptions.mode = 't2v'; // Default to text-to-video
    if (settings.duration) priceOptions.duration = settings.duration;
    if (settings.quality) priceOptions.videoQuality = settings.quality;
    if (settings.resolution) priceOptions.resolution = settings.resolution;
    if (settings.audio !== undefined) priceOptions.audio = settings.audio;
    if (settings.modelVariant) priceOptions.modelVariant = settings.modelVariant;
  }

  const computed = computePrice(modelId, priceOptions);

  return {
    stars: computed.stars,
    credits: computed.credits,
    approxRub: computed.approxRub,
    breakdown: `${settings.model}${settings.quality ? ` (${settings.quality})` : ''}${settings.duration ? ` ${settings.duration}с` : ''}`,
  };
}

/**
 * Hook for calculating generation cost based on current settings
 * Uses the same pricing logic as the API endpoints
 */
export function useCostCalculation(
  mode: GeneratorMode,
  settings: GenerationSettings
): CostCalculationResult {
  return useMemo(() => {
    return calculateGenerationCost(mode, settings);
  }, [mode, settings]);
}
