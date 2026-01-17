/**
 * Veo 3.1 - Auto-registration
 */

import { registerVideoModel } from '@/models/registry';
import { veo31Config } from './config';

// Auto-register on import
registerVideoModel(veo31Config);

// Export for direct access
export { veo31Config };
export default veo31Config;
