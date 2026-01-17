/**
 * FLUX.2 Pro - Photo Model Configuration
 * Provider: KIE Market
 * Best for: Premium visuals, product photography, fashion
 */

import type { PhotoModelConfig } from '@/models/types';

export const flux2ProConfig: PhotoModelConfig = {
  id: 'flux-2-pro',
  name: 'FLUX.2 Pro',
  apiId: 'flux-2/pro-text-to-image',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'Резко, детально, "дорого" выглядит.',
  description:
    'Сильная генерация для стильных и детализированных картинок. Хорош для продуктовых сцен, интерьеров, fashion-кадров и "премиум-визуала".',
  rank: 6,
  featured: true,
  speed: 'medium',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    // 5 credits = 9⭐, 7 credits = 12⭐
    '1k': 9,
    '2k': 12,
  },
  qualityOptions: ['1k', '2k'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  shortLabel: '1K/2K',
};
