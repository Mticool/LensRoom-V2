/**
 * Utility to get available options for video models
 * Dynamically filters UI options based on model capabilities
 */

import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import type { VideoMode, VideoQuality } from '@/types/video-generator';

export interface ModelCapabilities {
  // Available modes (what user can select in Source Selector)
  availableModes: VideoMode[];

  // Available durations
  durationOptions: number[];

  // Available qualities
  qualityOptions: VideoQuality[];

  // Available aspect ratios
  aspectRatios: string[];

  // Feature flags
  supportsAudio: boolean;
  supportsI2v: boolean;
  supportsV2v: boolean; // NEW: Video-to-Video support
  supportsStartEnd: boolean;
  supportsMotion: boolean; // NEW: Motion Control support (Kling)
  supportsEdit: boolean; // NEW: Video Edit support (Kling O1)
  supportsStoryboard: boolean;

  // Phase 2: Advanced Settings
  supportsNegativePrompt: boolean;
  availableVariants: string[]; // e.g., ['Kling 2.6', 'Kling O1']
  availableResolutions: string[]; // e.g., ['1080p_multi'] for WAN
  availableSoundPresets: string[]; // e.g., ['ambient', 'cinematic', 'upbeat'] for WAN

  // Fixed values (null if not fixed)
  fixedDuration: number | null;

  // Model info
  modelName: string;
  modelDescription: string;
}

/**
 * Map API modes to UI VideoMode
 */
function mapApiModeToVideoMode(apiMode: string): VideoMode | null {
  switch (apiMode) {
    case 't2v':
      return 'text';
    case 'i2v':
      return 'image';
    case 'v2v':
      return 'v2v';
    case 'start_end':
      return 'reference';
    case 'motion':
      return 'motion';
    case 'edit':
      return 'edit';
    default:
      return null;
  }
}

/**
 * Get available UI modes based on model's supported API modes
 */
function getAvailableModes(modelInfo: VideoModelConfig): VideoMode[] {
  const modes = new Set<VideoMode>();

  // t2v always maps to 'text'
  if (modelInfo.modes.includes('t2v')) {
    modes.add('text');
  }

  // i2v maps to 'image'
  if (modelInfo.modes.includes('i2v') && modelInfo.supportsI2v) {
    modes.add('image');
  }

  // v2v maps to 'v2v' mode
  if (modelInfo.modes.includes('v2v')) {
    modes.add('v2v');
  }

  // start_end maps to 'reference'
  if (modelInfo.modes.includes('start_end') || modelInfo.supportsStartEnd) {
    modes.add('reference');
  }

  // motion maps to 'motion' (Kling Motion)
  if (modelInfo.id === 'kling-motion-control') {
    modes.add('motion');
  }

  // edit maps to 'edit' (Kling O1 Edit)
  if (modelInfo.id === 'kling-o1-edit') {
    modes.add('edit');
  }

  return Array.from(modes);
}

/**
 * Get available durations for a model
 */
function getAvailableDurations(modelInfo: VideoModelConfig): number[] {
  // If fixed duration, return only that
  if (typeof modelInfo.fixedDuration === 'number') {
    return [modelInfo.fixedDuration];
  }

  // Parse duration options (can be numbers or strings like "15-25")
  const durations: number[] = [];

  for (const option of modelInfo.durationOptions || []) {
    if (typeof option === 'number') {
      durations.push(option);
    } else if (typeof option === 'string') {
      // Handle range strings like "15-25"
      const match = option.match(/^(\d+)-(\d+)$/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        // Add middle value for simplicity
        durations.push(Math.floor((start + end) / 2));
      } else {
        // Try to parse as number
        const parsed = parseInt(option, 10);
        if (!isNaN(parsed)) {
          durations.push(parsed);
        }
      }
    }
  }

  // Default fallback
  if (durations.length === 0) {
    return [5, 10];
  }

  // Sort and return unique values
  return Array.from(new Set(durations)).sort((a, b) => a - b);
}

/**
 * Get available quality options for a model
 */
function getAvailableQualities(modelInfo: VideoModelConfig): VideoQuality[] {
  const qualities = modelInfo.qualityOptions || [];

  // Map API quality names to UI quality names
  const qualityMap: Record<string, VideoQuality> = {
    '720p': '720p',
    '1080p': '1080p',
    '4k': '4K',
    '4K': '4K',
    'standard': '720p',
    'high': '1080p',
    'ultra': '4K',
    'fast': '720p',
    'quality': '1080p',
  };

  const mappedQualities = qualities
    .map((q) => qualityMap[q] || q)
    .filter((q): q is VideoQuality => ['720p', '1080p', '4K'].includes(q));

  // Remove duplicates
  const uniqueQualities = Array.from(new Set(mappedQualities));

  // Default fallback if none specified
  if (uniqueQualities.length === 0) {
    return ['720p', '1080p', '4K'];
  }

  return uniqueQualities;
}

/**
 * Get model capabilities for UI rendering
 */
export function getModelCapabilities(modelId: string): ModelCapabilities | null {
  const modelInfo = getModelById(modelId);

  if (!modelInfo || modelInfo.type !== 'video') {
    return null;
  }

  const videoModel = modelInfo as VideoModelConfig;

  return {
    availableModes: getAvailableModes(videoModel),
    durationOptions: getAvailableDurations(videoModel),
    qualityOptions: getAvailableQualities(videoModel),
    aspectRatios: videoModel.aspectRatios || ['16:9', '9:16', '1:1'],
    supportsAudio: videoModel.supportsAudio ?? true,
    supportsI2v: videoModel.supportsI2v ?? false,
    supportsV2v: videoModel.modes.includes('v2v'),
    supportsStartEnd: videoModel.supportsStartEnd ?? false,
    supportsMotion: videoModel.id === 'kling-motion-control',
    supportsEdit: videoModel.id === 'kling-o1-edit',
    supportsStoryboard: videoModel.supportsStoryboard ?? false,

    // Phase 2: Advanced Settings
    supportsNegativePrompt: videoModel.supportsNegativePrompt ?? false,
    availableVariants: videoModel.variants || [],
    availableResolutions: videoModel.resolutions || [],
    availableSoundPresets: videoModel.soundPresets || [],

    fixedDuration: videoModel.fixedDuration ?? null,
    modelName: videoModel.name,
    modelDescription: videoModel.description,
  };
}

/**
 * Get all available video models
 */
export function getAvailableVideoModels() {
  return VIDEO_MODELS;
}

/**
 * Check if a specific mode is supported by a model
 */
export function isModeSupported(modelId: string, mode: VideoMode): boolean {
  const capabilities = getModelCapabilities(modelId);
  if (!capabilities) return false;

  return capabilities.availableModes.includes(mode);
}

/**
 * Check if a specific duration is supported by a model
 */
export function isDurationSupported(modelId: string, duration: number): boolean {
  const capabilities = getModelCapabilities(modelId);
  if (!capabilities) return false;

  return capabilities.durationOptions.includes(duration);
}

/**
 * Get default values for a model
 */
export function getModelDefaults(modelId: string): {
  mode: VideoMode;
  duration: number;
  quality: VideoQuality;
  aspectRatio: string;
  withSound: boolean;
} {
  const capabilities = getModelCapabilities(modelId);

  if (!capabilities) {
    // Fallback defaults
    return {
      mode: 'text',
      duration: 5,
      quality: '1080p',
      aspectRatio: '16:9',
      withSound: true,
    };
  }

  return {
    mode: capabilities.availableModes[0] || 'text',
    duration: capabilities.durationOptions[0] || 5,
    quality: capabilities.qualityOptions[0] || '1080p',
    aspectRatio: capabilities.aspectRatios[0] || '16:9',
    withSound: capabilities.supportsAudio,
  };
}
