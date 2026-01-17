/**
 * Models Module - Main Entry Point
 * Import this file to load all models and access the registry
 */

// Export types
export * from './types';

// Export registry functions
export * from './registry';

// Import all models to trigger auto-registration
import './photo';
import './video';

/**
 * Example usage:
 *
 * 1. Get all models:
 *    import { getAllPhotoModels, getAllVideoModels } from '@/models';
 *    const photoModels = getAllPhotoModels();
 *
 * 2. Get specific model:
 *    import { getModelById } from '@/models';
 *    const model = getModelById('nano-banana');
 *
 * 3. Get featured models:
 *    import { getFeaturedPhotoModels } from '@/models';
 *    const featured = getFeaturedPhotoModels();
 *
 * 4. Direct access to a specific model:
 *    import { nanoBananaConfig } from '@/models/photo/nano-banana';
 */
