/**
 * Conditional logger - outputs only in development mode
 * Use instead of console.log for cleaner production builds
 * 
 * @example
 * import { logger } from '@/lib/logger';
 * logger.log('[Component] message', data);
 * logger.error('[API] error', error);
 */

const isDev = process.env.NODE_ENV !== 'production';

type LogArgs = Parameters<typeof console.log>;

export const logger = {
  log: (...args: LogArgs) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args: LogArgs) => {
    // Errors always logged (important for debugging production issues)
    console.error(...args);
  },
  
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args);
  },
  
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args);
  },
  
  /** Force log even in production (use sparingly) */
  force: (...args: LogArgs) => {
    console.log(...args);
  },
};

export default logger;

