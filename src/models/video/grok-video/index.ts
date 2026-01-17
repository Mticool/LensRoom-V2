/**
 * Grok Video - Auto-registration
 */

import { registerVideoModel } from '@/models/registry';
import { grokVideoConfig } from './config';

// Auto-register on import
registerVideoModel(grokVideoConfig);

// Export for direct access
export { grokVideoConfig };
export default grokVideoConfig;
