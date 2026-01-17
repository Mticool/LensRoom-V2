/**
 * Optimized API fetch utility combining deduplication and retry logic
 */

import { fetchDeduped } from './fetch-deduped';
import { fetchWithRetry, type RetryOptions } from './fetch-with-retry';
import logger from './logger';

export interface ApiFetchOptions extends RequestInit {
  retry?: RetryOptions | boolean;
  dedupe?: boolean;
}

/**
 * Optimized fetch for API calls with deduplication and retry
 */
export async function apiFetch(
  url: string,
  options?: ApiFetchOptions
): Promise<Response> {
  const { retry = true, dedupe = true, ...fetchOptions } = options || {};

  if (dedupe && retry) {
    // Both deduplication and retry - use retry logic
    // Note: deduplication happens inside fetchWithRetry via fetch calls
    const retryOpts = typeof retry === 'object' ? retry : undefined;
    return fetchWithRetry(url, fetchOptions, retryOpts);
  } else if (dedupe) {
    // Only deduplication
    return fetchDeduped(url, fetchOptions);
  } else if (retry) {
    // Only retry
    const retryOpts = typeof retry === 'object' ? retry : undefined;
    return fetchWithRetry(url, fetchOptions, retryOpts);
  }

  // No optimization - plain fetch
  return fetch(url, fetchOptions);
}

/**
 * Fetch and parse JSON with optimizations
 */
export async function apiFetchJson<T = unknown>(
  url: string,
  options?: ApiFetchOptions
): Promise<T> {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    logger.error(`[apiFetchJson] Request failed: ${response.status} ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  url: string,
  data: unknown,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  url: string,
  data: unknown,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetchJson<T>(url, {
    ...options,
    method: 'DELETE',
  });
}
