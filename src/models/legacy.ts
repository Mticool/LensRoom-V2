/**
 * Legacy compatibility layer
 * This file provides backward compatibility with old code that expects PHOTO_MODELS and VIDEO_MODELS arrays
 *
 * Usage in old code:
 * import { PHOTO_MODELS, VIDEO_MODELS } from '@/models/legacy';
 *
 * This works exactly like the old src/config/models.ts but uses the new modular system underneath
 */

import { getAllPhotoModels, getAllVideoModels } from './registry';
import type { PhotoModelConfig, VideoModelConfig, ModelConfig } from './types';

/**
 * PHOTO_MODELS array - compatible with old code
 * @deprecated Use getAllPhotoModels() from '@/models' instead
 */
export const PHOTO_MODELS: PhotoModelConfig[] = getAllPhotoModels();

/**
 * VIDEO_MODELS array - compatible with old code
 * @deprecated Use getAllVideoModels() from '@/models' instead
 */
export const VIDEO_MODELS: VideoModelConfig[] = getAllVideoModels();

/**
 * ALL_MODELS array - compatible with old code
 * @deprecated Use getAllModels() from '@/models' instead
 */
export const ALL_MODELS: ModelConfig[] = [...PHOTO_MODELS, ...VIDEO_MODELS];

/**
 * Helper function to find model by ID - compatible with old code
 * @deprecated Use getModelById() from '@/models' instead
 */
export function findModelById(id: string): ModelConfig | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

/**
 * Re-export types for compatibility
 */
export type {
  PhotoModelConfig,
  VideoModelConfig,
  ModelConfig,
  PhotoQuality,
  VideoQuality,
  VideoMode,
  PhotoMode,
  KieProvider,
  PhotoPricing,
  VideoPricing,
  VideoModelVariant,
  ModelType,
} from './types';
