/**
 * Kling AI Avatar - Video Model Configuration
 * Provider: KIE Market
 * Best for: Talking avatars from photos
 */

import type { VideoModelConfig } from '@/models/types';

export const klingAiAvatarConfig: VideoModelConfig = {
  id: 'kling-ai-avatar',
  name: 'Kling AI Avatar',
  apiId: 'kling/v1-avatar-standard',
  type: 'video',
  provider: 'kie_market',
  description:
    'AI Avatar генерация: создавайте говорящие аватары из фото. Два режима качества: Standard (720p) и Pro (1080p).',
  rank: 9,
  featured: true,
  speed: 'medium',
  quality: 'high',
  supportsI2v: true,
  supportsAudio: false,
  pricing: {
    // standard 720p: 5s=70⭐, 10s=140⭐, 15s=210⭐
    // pro 1080p: 5s=135⭐, 10s=270⭐, 15s=405⭐
    '720p': { '5': 70, '10': 140, '15': 210 },
    '1080p': { '5': 135, '10': 270, '15': 405 },
  },
  modelVariants: [
    {
      id: 'kling-ai-avatar-standard',
      name: 'Kling AI Avatar Standard',
      apiId: 'kling/v1-avatar-standard',
      pricing: {
        '5': 70,
        '10': 140,
        '15': 210,
      },
    },
    {
      id: 'kling-ai-avatar-pro',
      name: 'Kling AI Avatar Pro',
      apiId: 'kling/ai-avatar-v1-pro',
      pricing: {
        '5': 135,
        '10': 270,
        '15': 405,
      },
    },
  ],
  modes: ['i2v'],
  durationOptions: [5, 10, 15],
  resolutionOptions: ['720p', '1080p'],
  aspectRatios: ['16:9', '9:16', '1:1'],
  shortLabel: 'Avatar • 5-15s',
};
