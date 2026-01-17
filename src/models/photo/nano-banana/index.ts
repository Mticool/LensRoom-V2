/**
 * Nano Banana - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { nanoBananaConfig } from './config';

// Auto-register on import
registerPhotoModel(nanoBananaConfig);

// Export for direct access
export { nanoBananaConfig };
export default nanoBananaConfig;
