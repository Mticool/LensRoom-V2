/**
 * Zod validation schemas for Generation data
 */

import { z } from 'zod';

/**
 * Generation status enum
 */
export const GenerationStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;

/**
 * Generation type enum
 */
export const GenerationTypeSchema = z.enum(['photo', 'video', 'upscale', 'remove-bg']);

export type GenerationType = z.infer<typeof GenerationTypeSchema>;

/**
 * Generation item schema
 */
export const GenerationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: GenerationTypeSchema,
  status: GenerationStatusSchema,
  model_id: z.string().optional(),
  model_name: z.string().optional(),
  prompt: z.string().optional(),
  negative_prompt: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  result_url: z.string().url().optional().nullable(),
  preview_url: z.string().url().optional().nullable(),
  error_message: z.string().optional().nullable(),
  credits_used: z.number().int().min(0).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  completed_at: z.string().optional().nullable(),
});

export type Generation = z.infer<typeof GenerationSchema>;

/**
 * Generation request schema
 */
export const GenerationRequestSchema = z.object({
  type: GenerationTypeSchema,
  model_id: z.string().min(1),
  prompt: z.string().min(1).optional(),
  negative_prompt: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  input_image: z.string().optional(),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

/**
 * Generation list response schema
 */
export const GenerationListSchema = z.object({
  generations: z.array(GenerationSchema),
  total: z.number().int().min(0).optional(),
  hasMore: z.boolean().optional(),
});

export type GenerationList = z.infer<typeof GenerationListSchema>;

/**
 * Safe parse generation list
 */
export function parseGenerationList(data: unknown): GenerationList {
  const result = GenerationListSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  // Fallback to empty list
  return {
    generations: [],
    total: 0,
    hasMore: false,
  };
}

/**
 * Safe parse generation
 */
export function parseGeneration(data: unknown): Generation | null {
  const result = GenerationSchema.safeParse(data);
  return result.success ? result.data : null;
}
