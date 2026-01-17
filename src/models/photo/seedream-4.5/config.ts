/**
 * Seedream 4.5 - Photo Model Configuration
 * Provider: KIE Market
 * Best for: Modern visuals, creative graphics
 */

import type { PhotoModelConfig } from '@/models/types';

export const seedream45Config: PhotoModelConfig = {
  id: 'seedream-4.5',
  name: 'Seedream 4.5',
  apiId: 'seedream/4.5-text-to-image',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'Новая версия: больше качества и стабильности в стиле.',
  description:
    'Улучшенная Seedream: лучше детали и чище результат. Отлично для современных визуалов и креативной графики.',
  rank: 9,
  featured: true,
  speed: 'medium',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    // 6.5 credits = 11⭐
    turbo: 11,
    balanced: 11,
    quality: 11,
  },
  qualityOptions: ['turbo', 'balanced', 'quality'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '21:9'],
  shortLabel: 'Turbo/Quality',
};
