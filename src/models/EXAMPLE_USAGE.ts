/**
 * Example Usage of Modular Model System
 * This file demonstrates how to use the new model registry
 */

import {
  getAllPhotoModels,
  getAllVideoModels,
  getModelById,
  getFeaturedPhotoModels,
  getRegistryStats,
  type PhotoModelConfig,
  type VideoModelConfig,
} from '@/models';

// Import specific models directly if needed
import { nanoBananaConfig } from '@/models/photo/nano-banana';
import { veo31Config } from '@/models/video/veo-3.1';

/**
 * EXAMPLE 1: Get all photo models
 */
function getAllPhotos() {
  const models = getAllPhotoModels();
  console.log(`Found ${models.length} photo models:`);
  models.forEach((m) => {
    console.log(`- ${m.name} (${m.id}) - ${m.shortLabel}`);
  });
  return models;
}

/**
 * EXAMPLE 2: Get specific model by ID
 */
function getSpecificModel(id: string) {
  const model = getModelById(id);
  if (!model) {
    console.error(`Model "${id}" not found!`);
    return null;
  }
  console.log(`Found: ${model.name}`);
  console.log(`Provider: ${model.provider}`);
  console.log(`Pricing:`, model.pricing);
  return model;
}

/**
 * EXAMPLE 3: Get featured models for homepage
 */
function getFeaturedForHomepage() {
  const photoFeatured = getFeaturedPhotoModels();
  console.log(`Featured photo models: ${photoFeatured.length}`);
  photoFeatured.forEach((m) => {
    console.log(`⭐ ${m.name} - ${m.shortDescription}`);
  });
  return photoFeatured;
}

/**
 * EXAMPLE 4: Direct access to specific model config
 */
function useDirectImport() {
  console.log('Nano Banana pricing:', nanoBananaConfig.pricing);
  console.log('Veo 3.1 duration:', veo31Config.fixedDuration);
  console.log('Veo 3.1 modes:', veo31Config.modes);
}

/**
 * EXAMPLE 5: Filter models by criteria
 */
function filterByProvider(provider: string) {
  const all = [...getAllPhotoModels(), ...getAllVideoModels()];
  const filtered = all.filter((m) => m.provider === provider);
  console.log(`Models using ${provider}: ${filtered.length}`);
  return filtered;
}

/**
 * EXAMPLE 6: Check registry stats
 */
function checkStats() {
  const stats = getRegistryStats();
  console.log('Registry Stats:');
  console.log(`- Total models: ${stats.totalModels}`);
  console.log(`- Photo models: ${stats.photoModels}`);
  console.log(`- Video models: ${stats.videoModels}`);
  console.log(`- Featured photo: ${stats.featuredPhoto}`);
  console.log(`- Featured video: ${stats.featuredVideo}`);
  return stats;
}

/**
 * EXAMPLE 7: Type-safe model usage
 */
function useTypeGuards(modelId: string) {
  const model = getModelById(modelId);
  if (!model) return;

  if (model.type === 'photo') {
    // TypeScript knows this is PhotoModelConfig
    const photoModel: PhotoModelConfig = model;
    console.log('Supports I2I:', photoModel.supportsI2i);
    console.log('Fixed resolution:', photoModel.fixedResolution);
  } else if (model.type === 'video') {
    // TypeScript knows this is VideoModelConfig
    const videoModel: VideoModelConfig = model;
    console.log('Supports I2V:', videoModel.supportsI2v);
    console.log('Supports audio:', videoModel.supportsAudio);
    console.log('Modes:', videoModel.modes);
  }
}

/**
 * EXAMPLE 8: Build UI from registry
 */
function buildModelDropdown() {
  const models = getAllPhotoModels();
  return models.map((model) => ({
    value: model.id,
    label: model.name,
    description: model.shortDescription || model.description,
    badge: model.shortLabel,
    featured: model.featured,
    pricing: model.pricing,
  }));
}

// Export examples for testing
export {
  getAllPhotos,
  getSpecificModel,
  getFeaturedForHomepage,
  useDirectImport,
  filterByProvider,
  checkStats,
  useTypeGuards,
  buildModelDropdown,
};

/**
 * Run all examples (for testing)
 */
if (require.main === module) {
  console.log('=== MODEL SYSTEM EXAMPLES ===\n');

  console.log('1. Get all photos:');
  getAllPhotos();

  console.log('\n2. Get specific model:');
  getSpecificModel('nano-banana');

  console.log('\n3. Get featured:');
  getFeaturedForHomepage();

  console.log('\n4. Direct import:');
  useDirectImport();

  console.log('\n5. Filter by provider:');
  filterByProvider('laozhang');

  console.log('\n6. Registry stats:');
  checkStats();

  console.log('\n7. Type guards:');
  useTypeGuards('veo-3.1');

  console.log('\n8. Build dropdown:');
  const dropdown = buildModelDropdown();
  console.log(`Built ${dropdown.length} dropdown items`);
}
