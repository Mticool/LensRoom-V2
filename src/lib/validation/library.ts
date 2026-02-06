/**
 * Zod validation schemas for Library data
 */

import { z } from 'zod';

// UI Status enum
export const UiStatusSchema = z.enum(['queued', 'generating', 'success', 'failed']);
export type UiStatus = z.infer<typeof UiStatusSchema>;

// Preview status enum
export const PreviewStatusSchema = z.enum(['none', 'processing', 'ready', 'failed']);
export type PreviewStatus = z.infer<typeof PreviewStatusSchema>;

// Library item schema
export const LibraryItemSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  prompt: z.string().optional(),
  model_name: z.string().optional(),
  preview_status: PreviewStatusSchema,
  originalUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  displayUrl: z.string().nullable(),
  resultUrls: z.array(z.string()).nullable().optional(),
});

export type LibraryItem = z.infer<typeof LibraryItemSchema>;

// API response schema
export const LibraryResponseSchema = z.object({
  data: z.array(LibraryItemSchema),
  hasMore: z.boolean().optional().default(false),
  count: z.number().optional(),
});

export type LibraryResponse = z.infer<typeof LibraryResponseSchema>;

/**
 * Normalize status string to UiStatus
 */
export function normalizeStatus(s: unknown): UiStatus {
  const v = String(s || '').toLowerCase();
  if (v === 'success' || v === 'completed' || v === 'succeeded') return 'success';
  if (v === 'queued' || v === 'waiting' || v === 'queuing') return 'queued';
  if (v === 'generating' || v === 'processing' || v === 'pending') return 'generating';
  return 'failed';
}

/**
 * Safe parse with fallback
 */
export function parseLibraryResponse(data: unknown): LibraryResponse {
  const result = LibraryResponseSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  // Fallback to empty response
  return {
    data: [],
    hasMore: false,
  };
}
