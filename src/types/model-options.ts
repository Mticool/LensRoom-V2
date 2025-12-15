/**
 * Model options types for unified model system
 */

import type { ModelConfig, PhotoModelConfig, VideoModelConfig } from '@/config/models';

export interface PhotoGenerationOptions {
  modelId: string;
  mode: 't2i' | 'i2i';
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  variants: number;
  quality?: string; // '1k', '2k', '4k', 'turbo', 'balanced', 'quality', 'fast', 'ultra', '1k_2k'
  resolution?: string; // '512x512', '1024x1024', etc.
  referenceImage?: string; // For i2i mode
  referenceStrength?: number;
  seed?: number;
  cfgScale?: number;
  steps?: number;
}

export interface VideoGenerationOptions {
  modelId: string;
  mode: 't2v' | 'i2v' | 'start_end' | 'storyboard';
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  variants: number;
  duration: number | string; // 5, 10, 15, or '15-25'
  quality?: '720p' | '1080p' | 'fast' | 'quality';
  audio?: boolean; // For models that support audio
  referenceImage?: string; // For i2v mode
  startImage?: string; // For start_end mode
  endImage?: string; // For start_end mode
  storyboardScenes?: Array<{ prompt: string; image?: string }>; // For storyboard mode
  seed?: number;
  motionStrength?: number;
}

export type GenerationOptions = PhotoGenerationOptions | VideoGenerationOptions;

