/**
 * Grok Video - Video Model Configuration
 * Provider: xAI via KIE Market
 * Best for: Short videos with synchronized audio and Spicy Mode 🌶️
 */

import type { VideoModelConfig } from '@/models/types';

export const grokVideoConfig: VideoModelConfig = {
  id: 'grok-video',
  name: 'Grok Video',
  apiId: 'grok-imagine/text-to-video',
  type: 'video',
  provider: 'kie_market',
  description:
    'Grok Video от xAI — создаёт короткие видео с синхронизированным звуком. Поддерживает Text-to-Video и Image-to-Video с тремя режимами: Normal, Fun, Spicy 🌶️',
  rank: 1,
  featured: true,
  speed: 'fast',
  quality: 'high',
  supportsI2v: true,
  supportsAudio: true,
  supportsStartEnd: false,
  pricing: 25,
  modes: ['t2v', 'i2v'],
  durationOptions: [5],
  aspectRatios: ['1:1', '3:2', '2:3'],
  shortLabel: 'xAI 🌶️',
};
