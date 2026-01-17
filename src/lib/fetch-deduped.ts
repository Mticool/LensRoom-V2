/**
 * Request deduplication utility
 * Prevents duplicate simultaneous requests to the same endpoint
 */

import logger from '@/lib/logger';

// Cache of pending requests
const pendingRequests = new Map<string, Promise<Response>>();

/**
 * Creates a unique cache key for a request
 */
function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  const headers = options?.headers ? JSON.stringify(options.headers) : '';

  return `${method}:${url}:${body}:${headers}`;
}

/**
 * Fetch with automatic deduplication
 * Multiple simultaneous calls to the same endpoint will share the same request
 */
export async function fetchDeduped(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const cacheKey = getCacheKey(url, options);

  // Check if there's already a pending request for this
  if (pendingRequests.has(cacheKey)) {
    logger.log(`[fetchDeduped] Reusing pending request for: ${url}`);
    return pendingRequests.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = fetch(url, options).finally(() => {
    // Clean up from cache when done
    pendingRequests.delete(cacheKey);
  });

  // Store in cache
  pendingRequests.set(cacheKey, requestPromise);
  logger.log(`[fetchDeduped] New request for: ${url}`);

  return requestPromise;
}

/**
 * Clear all pending requests (useful for cleanup on logout, navigation, etc.)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
  logger.log('[fetchDeduped] Cleared all pending requests');
}

/**
 * Get count of pending requests (useful for debugging)
 */
export function getPendingRequestsCount(): number {
  return pendingRequests.size;
}
