/**
 * Bytedance Pro - Video Model Configuration
 * Provider: KIE Market
 * Best for: Fast batch video generation for testing creatives
 */

import type { VideoModelConfig } from '@/models/types';

export const bytedanceProConfig: VideoModelConfig = {
  id: 'bytedance-pro',
  name: 'Bytedance Pro',
  apiId: 'bytedance/v1-pro-image-to-video',
  type: 'video',
  provider: 'kie_market',
  description: 'Быстрые ролики «пачкой» для тестов креативов и контент-завода.',
  rank: 7,
  featured: false,
  speed: 'fast',
  quality: 'standard',
  supportsI2v: true,
  pricing: {
    // 720p: 5s=27⭐, 10s=61⭐; 1080p: 5s=61⭐, 10s=121⭐
    '720p': { '5': 27, '10': 61 },
    '1080p': { '5': 61, '10': 121 },
  },
  modes: ['i2v'],
  durationOptions: [5, 10],
  resolutionOptions: ['720p', '1080p'],
  aspectRatios: ['16:9', '9:16'],
  shortLabel: '5/10s • Fast',
};
