/**
 * Nano Banana Pro - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { nanoBananaProConfig } from './config';

// Auto-register on import
registerPhotoModel(nanoBananaProConfig);

// Export for direct access
export { nanoBananaProConfig };
export default nanoBananaProConfig;
