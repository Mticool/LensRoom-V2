'use client';

/**
 * GeneratorV2 - Legacy component (replaced by specialized generators)
 * 
 * This file is kept ONLY for type exports used by other components.
 * For actual generation UI, use the unified Studio page: `/create/studio`.
 */

export type GeneratorMode = 'image' | 'video';

export interface GenerationSettings {
  model: string;
  size: string;
  style?: string;
  quality?: string;
  outputFormat?: 'png' | 'jpg' | 'webp';
  variants?: number;
  steps?: number;
  negativePrompt?: string;
  seed?: number;
  batchSize?: number;
  // Video specific
  duration?: number;
  audio?: boolean;
  modelVariant?: string;
  resolution?: string;
  // Midjourney specific
  mjSettings?: {
    stylization?: number;
    chaos?: number;
    weirdness?: number;
    variety?: number;
  };
}

export interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  mode: GeneratorMode;
  settings: GenerationSettings;
  timestamp: number;
  previewUrl?: string;
  status?: string;
  pendingId?: string; // ID of pending placeholder to update on success
  /** Client-side grouping for multi-variant runs (mobile viewer). */
  runId?: string;
}

/**
 * @deprecated Use specialized generators instead
 */
export function GeneratorV2() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A] text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">GeneratorV2 is deprecated</h1>
        <p className="text-gray-400">
          Please use the unified Studio generator: /create/studio
        </p>
      </div>
    </div>
  );
}
