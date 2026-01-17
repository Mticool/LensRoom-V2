/**
 * Grok Imagine - Photo Model Configuration
 * Provider: xAI via KIE Market
 * Best for: Creative images with Spicy Mode 🌶️
 */

import type { PhotoModelConfig } from '@/models/types';

export const grokImagineConfig: PhotoModelConfig = {
  id: 'grok-imagine',
  name: 'Grok Imagine',
  apiId: 'grok-imagine/text-to-image',
  type: 'photo',
  provider: 'kie_market',
  shortDescription: 'xAI: креативные изображения с Spicy Mode 🌶️',
  description:
    'Grok Imagine от xAI — мультимодальная модель с тремя режимами: Normal, Fun и Spicy. Spicy Mode создаёт более выразительные и креативные результаты.',
  rank: 1,
  featured: true,
  speed: 'fast',
  quality: 'high',
  supportsI2i: false,
  pricing: 15,
  aspectRatios: ['1:1', '3:2', '2:3'],
  shortLabel: 'xAI 🌶️',
};
