/**
 * GPT Image 1.5 - Photo Model Configuration
 * Provider: OpenAI via KIE Market
 * Best for: Fast generation, text rendering, multi-image editing
 */

import type { PhotoModelConfig } from '@/models/types';

export const gptImageConfig: PhotoModelConfig = {
  id: 'gpt-image',
  name: 'GPT Image 1.5',
  apiId: 'gpt-image/1.5-text-to-image',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'OpenAI 1.5: 4x быстрее, лучше текст, до 16 фото для редактирования.',
  description:
    'GPT Image 1.5 — улучшенная модель OpenAI. Генерация в 4x быстрее, точнее рендерит текст на изображениях, поддерживает редактирование до 16 фото одновременно.',
  rank: 3,
  featured: true,
  speed: 'fast',
  quality: 'ultra',
  supportsI2i: true,
  pricing: {
    // medium = быстро, high = детали
    medium: 17,
    high: 67,
  },
  qualityOptions: ['medium', 'high'],
  aspectRatios: ['1:1', '3:2', '2:3'],
  shortLabel: 'OpenAI 1.5',
};
