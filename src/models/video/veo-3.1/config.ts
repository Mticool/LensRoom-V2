/**
 * Veo 3.1 - Video Model Configuration
 * Provider: LaoZhang API
 * Best for: Fast 8-second videos with excellent physics and camera control
 */

import type { VideoModelConfig } from '@/models/types';

export const veo31Config: VideoModelConfig = {
  id: 'veo-3.1',
  name: 'Veo 3.1',
  apiId: 'veo-3.1',
  apiIdFast: 'veo-3.1-fast',
  apiIdLandscape: 'veo-3.1-landscape',
  apiIdLandscapeFast: 'veo-3.1-landscape-fast',
  type: 'video',
  provider: 'laozhang',
  description:
    'Самая быстрая модель для видео (8 сек за ~1 минуту). Отличное качество, стабильная физика, хорошо держит движение камеры и объекты. Поддерживает режим первый-последний кадр (start_end).',
  rank: 1,
  featured: true,
  speed: 'slow',
  quality: 'ultra',
  supportsI2v: true,
  supportsAudio: true,
  supportsStartEnd: true,
  fixedDuration: 8,
  pricing: {
    fast: { '8': 99 },
    quality: { '8': 490 },
  },
  modes: ['t2v', 'i2v', 'start_end'],
  durationOptions: [8],
  qualityOptions: ['fast', 'quality'],
  aspectRatios: ['16:9', '9:16'],
  shortLabel: '8s • от 99⭐',
};
