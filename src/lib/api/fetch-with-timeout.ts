/**
 * Fetch utility with timeout and abort support
 * Prevents hanging requests and memory leaks
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // Timeout in ms (default: 60000 = 60s)
  abortSignal?: AbortSignal; // External abort signal
}

export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchAbortedError';
  }
}

/**
 * Fetch with automatic timeout and abort signal support
 *
 * @param url - URL to fetch
 * @param options - Fetch options + timeout
 * @returns Promise<Response>
 * @throws FetchTimeoutError if request times out
 * @throws FetchAbortedError if request is aborted
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const response = await fetchWithTimeout('https://api.example.com', {
 *   timeout: 30000,
 *   abortSignal: controller.signal
 * });
 *
 * // Cancel the request
 * controller.abort();
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 60000, // Default 60s for API requests
    abortSignal,
    ...fetchOptions
  } = options;

  // Create internal abort controller for timeout
  const timeoutController = new AbortController();

  // Combine with external abort signal if provided
  let combinedSignal: AbortSignal;

  if (abortSignal) {
    // If external signal already aborted, throw immediately
    if (abortSignal.aborted) {
      throw new FetchAbortedError('Request was aborted before fetch');
    }

    // Create combined signal that aborts on either timeout or external abort
    const anyAbortController = new AbortController();

    const abortHandler = () => {
      if (abortSignal.aborted) {
        anyAbortController.abort();
      }
      if (timeoutController.signal.aborted) {
        anyAbortController.abort();
      }
    };

    abortSignal.addEventListener('abort', abortHandler);
    timeoutController.signal.addEventListener('abort', abortHandler);

    combinedSignal = anyAbortController.signal;
  } else {
    combinedSignal = timeoutController.signal;
  }

  // Set timeout
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if it was a timeout
    if (timeoutController.signal.aborted && !abortSignal?.aborted) {
      throw new FetchTimeoutError(`Request timeout after ${timeout}ms`);
    }

    // Check if it was an external abort
    if (abortSignal?.aborted) {
      throw new FetchAbortedError('Request was cancelled');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Helper to create a reusable fetch function with specific timeout
 *
 * @example
 * ```ts
 * const fetchAPI = createFetchWithTimeout(30000); // 30s timeout
 * const response = await fetchAPI('https://api.example.com');
 * ```
 */
export function createFetchWithTimeout(defaultTimeout: number) {
  return (url: string, options?: FetchWithTimeoutOptions) =>
    fetchWithTimeout(url, { timeout: defaultTimeout, ...options });
}
