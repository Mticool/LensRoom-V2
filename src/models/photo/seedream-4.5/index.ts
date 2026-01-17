/**
 * Seedream 4.5 - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { seedream45Config } from './config';

// Auto-register on import
registerPhotoModel(seedream45Config);

// Export for direct access
export { seedream45Config };
export default seedream45Config;
