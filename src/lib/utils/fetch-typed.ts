/**
 * Type-safe fetch utilities
 */

import { z } from 'zod';
import { handleError, ApiError } from '@/lib/errors/error-handler';
import logger from '@/lib/logger';

/**
 * Type-safe fetch with JSON parsing and validation
 */
export async function fetchTyped<T>(
  url: string,
  options?: RequestInit,
  schema?: z.ZodSchema<T>
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(
        `HTTP ${response.status}: ${errorText}`,
        response.status,
        undefined,
        errorText
      );
    }

    const data: unknown = await response.json();

    // If schema provided, validate the data
    if (schema) {
      const result = schema.safeParse(data);
      if (result.success) {
        return result.data;
      } else {
        logger.error('[fetchTyped] Validation error:', result.error);
        throw new Error(`Invalid response format: ${result.error.message}`);
      }
    }

    return data as T;
  } catch (error) {
    handleError(error, 'fetchTyped');
    throw error;
  }
}

/**
 * Type-safe POST request
 */
export async function postTyped<TRequest, TResponse>(
  url: string,
  data: TRequest,
  schema?: z.ZodSchema<TResponse>,
  options?: RequestInit
): Promise<TResponse> {
  return fetchTyped<TResponse>(
    url,
    {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    },
    schema
  );
}

/**
 * Type-safe GET request
 */
export async function getTyped<T>(
  url: string,
  schema?: z.ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  return fetchTyped<T>(
    url,
    {
      ...options,
      method: 'GET',
    },
    schema
  );
}

/**
 * Type-safe PUT request
 */
export async function putTyped<TRequest, TResponse>(
  url: string,
  data: TRequest,
  schema?: z.ZodSchema<TResponse>,
  options?: RequestInit
): Promise<TResponse> {
  return fetchTyped<TResponse>(
    url,
    {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    },
    schema
  );
}

/**
 * Type-safe DELETE request
 */
export async function deleteTyped<T>(
  url: string,
  schema?: z.ZodSchema<T>,
  options?: RequestInit
): Promise<T> {
  return fetchTyped<T>(
    url,
    {
      ...options,
      method: 'DELETE',
    },
    schema
  );
}
