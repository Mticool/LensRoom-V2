/**
 * Kling AI Avatar - Auto-registration
 */

import { registerVideoModel } from '@/models/registry';
import { klingAiAvatarConfig } from './config';

// Auto-register on import
registerVideoModel(klingAiAvatarConfig);

// Export for direct access
export { klingAiAvatarConfig };
export default klingAiAvatarConfig;
