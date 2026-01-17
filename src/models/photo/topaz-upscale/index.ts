/**
 * Topaz Upscale - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { topazUpscaleConfig } from './config';

// Auto-register on import
registerPhotoModel(topazUpscaleConfig);

// Export for direct access
export { topazUpscaleConfig };
export default topazUpscaleConfig;
