/**
 * GPT Image 1.5 - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { gptImageConfig } from './config';

// Auto-register on import
registerPhotoModel(gptImageConfig);

// Export for direct access
export { gptImageConfig };
export default gptImageConfig;
