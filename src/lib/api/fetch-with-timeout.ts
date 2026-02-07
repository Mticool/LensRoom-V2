/**
 * Fetch utility with timeout and abort support
 * Prevents hanging requests and memory leaks
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // Timeout in ms (default: 60000 = 60s)
  abortSignal?: AbortSignal; // External abort signal (preferred over RequestInit.signal)
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
    // Allow callers to pass `signal` (native fetch option). We treat it as the external abort signal.
    signal,
    ...fetchOptions
  } = options as FetchWithTimeoutOptions & { signal?: AbortSignal };

  const externalAbortSignal = abortSignal ?? signal;

  // Create internal abort controller for timeout
  const timeoutController = new AbortController();

  // Combine with external abort signal if provided
  let combinedSignal: AbortSignal;

  if (externalAbortSignal) {
    // If external signal already aborted, throw immediately
    if (externalAbortSignal.aborted) {
      throw new FetchAbortedError('Request was aborted before fetch');
    }

    // Create combined signal that aborts on either timeout or external abort
    const anyAbortController = new AbortController();

    const abortHandler = () => {
      // Abort when either signal is aborted.
      if (
        !anyAbortController.signal.aborted &&
        (externalAbortSignal.aborted || timeoutController.signal.aborted)
      ) {
        anyAbortController.abort();
      }
    };

    // Use `once` so listeners auto-cleanup and do not leak across repeated calls.
    externalAbortSignal.addEventListener('abort', abortHandler, { once: true });
    timeoutController.signal.addEventListener('abort', abortHandler, { once: true });

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
    if (timeoutController.signal.aborted && !externalAbortSignal?.aborted) {
      throw new FetchTimeoutError(`Request timeout after ${timeout}ms`);
    }

    // Check if it was an external abort
    if (externalAbortSignal?.aborted) {
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
