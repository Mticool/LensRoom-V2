/**
 * Grok Imagine - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { grokImagineConfig } from './config';

// Auto-register on import
registerPhotoModel(grokImagineConfig);

// Export for direct access
export { grokImagineConfig };
export default grokImagineConfig;
