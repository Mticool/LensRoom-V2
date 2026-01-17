/**
 * Model Registry - Centralized model management
 * All models are automatically registered here when imported
 */

import type { PhotoModelConfig, VideoModelConfig, ModelConfig } from './types';

// Storage maps
const photoModels = new Map<string, PhotoModelConfig>();
const videoModels = new Map<string, VideoModelConfig>();

/**
 * Register a photo model
 */
export function registerPhotoModel(model: PhotoModelConfig): void {
  if (photoModels.has(model.id)) {
    console.warn(`[ModelRegistry] Photo model "${model.id}" is already registered. Overwriting.`);
  }
  photoModels.set(model.id, model);
}

/**
 * Register a video model
 */
export function registerVideoModel(model: VideoModelConfig): void {
  if (videoModels.has(model.id)) {
    console.warn(`[ModelRegistry] Video model "${model.id}" is already registered. Overwriting.`);
  }
  videoModels.set(model.id, model);
}

/**
 * Get all photo models
 */
export function getAllPhotoModels(): PhotoModelConfig[] {
  return Array.from(photoModels.values()).sort((a, b) => a.rank - b.rank);
}

/**
 * Get all video models
 */
export function getAllVideoModels(): VideoModelConfig[] {
  return Array.from(videoModels.values()).sort((a, b) => a.rank - b.rank);
}

/**
 * Get all models (photo + video)
 */
export function getAllModels(): ModelConfig[] {
  return [...getAllPhotoModels(), ...getAllVideoModels()];
}

/**
 * Get model by ID (searches both photo and video)
 */
export function getModelById(id: string): ModelConfig | undefined {
  return photoModels.get(id) || videoModels.get(id);
}

/**
 * Get photo model by ID
 */
export function getPhotoModelById(id: string): PhotoModelConfig | undefined {
  return photoModels.get(id);
}

/**
 * Get video model by ID
 */
export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return videoModels.get(id);
}

/**
 * Get featured photo models
 */
export function getFeaturedPhotoModels(): PhotoModelConfig[] {
  return getAllPhotoModels().filter((m) => m.featured);
}

/**
 * Get featured video models
 */
export function getFeaturedVideoModels(): VideoModelConfig[] {
  return getAllVideoModels().filter((m) => m.featured);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelConfig[] {
  return getAllModels().filter((m) => m.provider === provider);
}

/**
 * Clear all models (useful for testing)
 */
export function clearRegistry(): void {
  photoModels.clear();
  videoModels.clear();
}

/**
 * Get registry stats
 */
export function getRegistryStats() {
  return {
    totalModels: photoModels.size + videoModels.size,
    photoModels: photoModels.size,
    videoModels: videoModels.size,
    featuredPhoto: getFeaturedPhotoModels().length,
    featuredVideo: getFeaturedVideoModels().length,
  };
}
