/**
 * Bytedance Pro - Auto-registration
 */

import { registerVideoModel } from '@/models/registry';
import { bytedanceProConfig } from './config';

// Auto-register on import
registerVideoModel(bytedanceProConfig);

// Export for direct access
export { bytedanceProConfig };
export default bytedanceProConfig;
