/**
 * Z-image - Photo Model Configuration
 * Provider: KIE Market
 * Best for: Universal image generation, budget-friendly
 */

import type { PhotoModelConfig } from '@/models/types';

export const zImageConfig: PhotoModelConfig = {
  id: 'z-image',
  name: 'Z-image',
  apiId: 'z-image',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'Универсальный генератор изображений.',
  description: 'Универсальный генератор изображений.',
  rank: 14,
  featured: true,
  speed: 'fast',
  quality: 'high',
  supportsI2i: true,
  pricing: {
    // 0.8 credit = 2⭐
    turbo: 2,
    balanced: 2,
    quality: 2,
  },
  qualityOptions: ['turbo', 'balanced', 'quality'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  shortLabel: '2⭐',
};
