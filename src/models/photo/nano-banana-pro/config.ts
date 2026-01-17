/**
 * Nano Banana Pro - Photo Model Configuration
 * Provider: LaoZhang
 * Best for: Premium quality, fine details, commercial use
 */

import type { PhotoModelConfig } from '@/models/types';

export const nanoBananaProConfig: PhotoModelConfig = {
  id: 'nano-banana-pro',
  name: 'Nano Banana Pro',
  apiId: 'gemini-3-pro-image-preview',
  apiId2k: 'gemini-3-pro-image-preview-2k',
  apiId4k: 'gemini-3-pro-image-preview-4k',
  type: 'photo',
  provider: 'laozhang',
  shortDescription: 'Максимум качества: детали, кожа, свет, чистые текстуры.',
  description:
    'Премиальная версия для коммерции: более точные материалы, лучше мелкие детали, меньше артефактов. Выбирай, когда картинка "должна продавать".',
  rank: 2,
  featured: true,
  speed: 'fast',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    // 18 credits = 30⭐, 24 credits = 40⭐
    '1k_2k': 30,
    '4k': 40,
  },
  qualityOptions: ['1k_2k', '4k'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  shortLabel: 'Pro • 1K-4K',
};
