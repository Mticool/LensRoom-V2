/**
 * Z-image - Auto-registration
 */

import { registerPhotoModel } from '@/models/registry';
import { zImageConfig } from './config';

// Auto-register on import
registerPhotoModel(zImageConfig);

// Export for direct access
export { zImageConfig };
export default zImageConfig;
