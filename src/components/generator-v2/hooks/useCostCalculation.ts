'use client';

import { useMemo } from 'react';
import { GeneratorMode, GenerationSettings } from '../GeneratorV2';
import { getSkuFromRequest, calculateTotalStars, type PricingOptions } from '@/lib/pricing/pricing';

interface CostCalculationResult {
  stars: number;
  credits: number;
  breakdown?: string;
  isIncludedInPlan?: boolean;
  sku?: string;
}

/**
 * Calculate the cost in stars for a generation based on model and settings
 * Uses the NEW pricing system (2026-01-27) - same as API
 */
export function calculateGenerationCost(
  mode: GeneratorMode,
  settings: GenerationSettings
): CostCalculationResult {
  const modelId = settings.model;
  
  try {
    // Build pricing options matching API format
    const pricingOptions: PricingOptions = {
      mode: mode === 'image' ? 't2i' : 't2v',
    };

    if (mode === 'image') {
      // Photo options
      if (settings.quality) pricingOptions.quality = settings.quality;
      if (settings.resolution) pricingOptions.resolution = settings.resolution;
    } else {
      // Video options
      if (settings.duration) pricingOptions.duration = settings.duration;
      if (settings.quality) pricingOptions.videoQuality = settings.quality;
      if (settings.resolution) pricingOptions.resolution = settings.resolution;
      if (settings.audio !== undefined) pricingOptions.audio = settings.audio;
      if (settings.modelVariant) pricingOptions.modelVariant = settings.modelVariant;
      // Check for motion control
      if (modelId === 'kling-motion-control' || modelId.includes('motion-control')) {
        pricingOptions.isMotionControl = true;
      }
    }

    // Generate SKU and calculate price
    const sku = getSkuFromRequest(modelId, pricingOptions);
    const stars = calculateTotalStars(sku, pricingOptions.duration);

    return {
      stars,
      credits: stars, // Legacy field for backwards compatibility
      sku,
      breakdown: `${settings.model}${settings.quality ? ` (${settings.quality})` : ''}${settings.duration ? ` ${settings.duration}с` : ''}`,
    };
  } catch (error) {
    console.error('[useCostCalculation] Pricing error:', {
      modelId,
      mode,
      settings,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return 0 stars on error (don't block UI)
    return {
      stars: 0,
      credits: 0,
      breakdown: 'Ошибка расчёта стоимости',
    };
  }
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
