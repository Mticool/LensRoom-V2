/**
 * Type-safe error handling utilities
 */

import logger from '@/lib/logger';

/**
 * Check if error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Get error code from API errors
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return undefined;
}

/**
 * Check if error is an abort error (cancelled request)
 */
export function isAbortError(error: unknown): boolean {
  if (isError(error)) {
    return error.name === 'AbortError';
  }
  return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (isError(error)) {
    return (
      error.message.includes('Network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
}

/**
 * Handle error with logging and return user-friendly message
 */
export function handleError(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  if (context) {
    logger.error(`[${context}] Error:`, { message, code: errorCode, error });
  } else {
    logger.error('Error:', { message, code: errorCode, error });
  }

  // Return user-friendly message
  if (isNetworkError(error)) {
    return 'Проблема с подключением к интернету';
  }

  if (isAbortError(error)) {
    return 'Запрос был отменен';
  }

  // Return original message for other errors
  return message;
}

/**
 * Typed API error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check if error is API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
