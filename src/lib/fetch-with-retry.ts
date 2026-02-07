/**
 * Fetch with automatic retry and exponential backoff
 */

import logger from '@/lib/logger';
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: number[]; // HTTP status codes to retry on
  shouldRetry?: (error: Error, response?: Response) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryOn: [408, 429, 500, 502, 503, 504], // Timeout, Rate limit, Server errors
  shouldRetry: () => true,
};

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Fetch with automatic retry on failures
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;
  let lastResponse: Response | undefined;
  const DEFAULT_TIMEOUT_MS = 20_000;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Ensure we never hang indefinitely on a dead connection.
      // If you need a longer timeout for a specific call, prefer using fetchWithTimeout directly.
      const response = await fetchWithTimeout(url, { ...(options || {}), timeout: DEFAULT_TIMEOUT_MS });

      // Check if response status code should trigger retry
      if (config.retryOn.includes(response.status)) {
        lastResponse = response;

        // Special handling for rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : calculateDelay(
                attempt,
                config.initialDelay,
                config.maxDelay,
                config.backoffMultiplier
              );

          logger.warn(
            `[fetchWithRetry] Rate limited (429). Retrying in ${delay}ms. Attempt ${attempt + 1}/${config.maxRetries + 1}`
          );

          if (attempt < config.maxRetries) {
            await sleep(delay);
            continue;
          }
        }

        // For other retryable status codes
        if (attempt < config.maxRetries) {
          const delay = calculateDelay(
            attempt,
            config.initialDelay,
            config.maxDelay,
            config.backoffMultiplier
          );

          logger.warn(
            `[fetchWithRetry] Request failed with status ${response.status}. Retrying in ${delay}ms. Attempt ${attempt + 1}/${config.maxRetries + 1}`
          );

          await sleep(delay);
          continue;
        }
      }

      // Success - return response
      if (response.ok || attempt === config.maxRetries) {
        return response;
      }

      // Non-retryable error status
      return response;
    } catch (error) {
      lastError = error as Error;

      // Network error or other exception
      if (attempt < config.maxRetries && config.shouldRetry(lastError)) {
        const delay = calculateDelay(
          attempt,
          config.initialDelay,
          config.maxDelay,
          config.backoffMultiplier
        );

        logger.error(
          `[fetchWithRetry] Request failed with error: ${lastError.message}. Retrying in ${delay}ms. Attempt ${attempt + 1}/${config.maxRetries + 1}`
        );

        await sleep(delay);
        continue;
      }

      // Max retries reached or shouldRetry returned false
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs this
  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error('Max retries reached');
}

/**
 * Fetch with retry and JSON parsing
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
