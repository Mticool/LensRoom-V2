/**
 * Common API response type definitions and validation
 */

import { z } from 'zod';

/**
 * Standard API success response
 */
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
});

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
};

/**
 * Standard API error response
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Parse API response with type safety
 */
export function parseApiResponse<T>(
  data: unknown,
  schema?: z.ZodSchema<T>
): ApiResponse<T> {
  // Check if it's an error response
  const errorResult = ApiErrorResponseSchema.safeParse(data);
  if (errorResult.success) {
    return errorResult.data;
  }

  // Check if it's a success response
  const successResult = ApiSuccessResponseSchema.safeParse(data);
  if (successResult.success) {
    const responseData = successResult.data.data;

    // If schema provided, validate the data
    if (schema && responseData) {
      const dataResult = schema.safeParse(responseData);
      if (dataResult.success) {
        return {
          success: true,
          data: dataResult.data,
          message: successResult.data.message,
        };
      } else {
        return {
          success: false,
          error: 'Invalid response data format',
          details: dataResult.error,
        };
      }
    }

    return {
      success: true,
      data: responseData as T,
      message: successResult.data.message,
    };
  }

  // If neither success nor error format, return generic error
  return {
    success: false,
    error: 'Invalid API response format',
  };
}

/**
 * User role type
 */
export const UserRoleSchema = z.enum(['admin', 'manager', 'user']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Pagination metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Create paginated response schema
 */
export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}
