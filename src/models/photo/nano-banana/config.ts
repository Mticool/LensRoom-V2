/**
 * Nano Banana - Photo Model Configuration
 * Provider: LaoZhang
 * Best for: Photorealism, fast turnaround
 */

import type { PhotoModelConfig } from '@/models/types';

export const nanoBananaConfig: PhotoModelConfig = {
  id: 'nano-banana',
  name: 'Nano Banana',
  apiId: 'gemini-2.5-flash-image-preview',
  type: 'photo',
  provider: 'laozhang',
  shortDescription: 'Фотореализм и "вкусная" картинка за секунды.',
  description:
    'Лучший универсал на каждый день: стабильный реализм, хорошие лица, одежда, предметка. Подходит для быстрых тестов идей и массового контента.',
  rank: 1,
  featured: true,
  speed: 'fast',
  quality: 'high',
  supportsI2i: true,
  pricing: {
    // 4 credits = 7⭐
    turbo: 7,
    balanced: 7,
    quality: 7,
  },
  qualityOptions: ['turbo', 'balanced', 'quality'],
  aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  shortLabel: 'Turbo/Quality',
};
