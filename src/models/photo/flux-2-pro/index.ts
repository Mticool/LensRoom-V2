/**
 * FLUX.2 Pro - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { flux2ProConfig } from './config';

// Auto-register on import
registerPhotoModel(flux2ProConfig);

// Export for direct access
export { flux2ProConfig };
export default flux2ProConfig;
