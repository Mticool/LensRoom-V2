/**
 * Topaz Upscale - Photo Model Configuration
 * Provider: KIE Market
 * Best for: Professional upscaling to 8K, print quality
 */

import type { PhotoModelConfig } from '@/models/types';

export const topazUpscaleConfig: PhotoModelConfig = {
  id: 'topaz-image-upscale',
  name: 'Topaz Upscale',
  apiId: 'topaz/image-upscale',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'Апскейл до 8K • Улучшение качества',
  description:
    'Профессиональный апскейл изображений до 8K разрешения. Улучшает детали, резкость и качество для печати, баннеров и крупных форматов.',
  rank: 2,
  featured: true,
  speed: 'medium',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    // 10 credits = 17⭐, 20 credits = 34⭐, 40 credits = 67⭐
    '2k': 17,
    '4k': 34,
    '8k': 67,
  },
  qualityOptions: ['2k', '4k', '8k'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  shortLabel: '2K/4K/8K',
};
