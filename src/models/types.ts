/**
 * Base types for modular model system
 * Extracted from src/config/models.ts for reusability
 */

export type ModelType = 'photo' | 'video';

export type PhotoQuality =
  | '1k'
  | '2k'
  | '4k'
  | '8k'
  | '1k_2k'
  | 'turbo'
  | 'balanced'
  | 'quality'
  | 'fast'
  | 'ultra'
  | 'medium'
  | 'high'
  | 'a_12cred'
  | 'a_18cred'
  | 'a_24cred'
  | 'b_36cred'
  | 'b_45cred'
  | 'b_54cred'
  | 'c_48cred'
  | 'c_60cred'
  | 'c_72cred';

export type VideoQuality = '720p' | '1080p' | '480p' | '580p' | 'fast' | 'quality' | 'standard' | 'high';
export type VideoMode = 't2v' | 'i2v' | 'start_end' | 'storyboard' | 'reference' | 'v2v';
export type PhotoMode = 't2i' | 'i2i';

export type KieProvider = 'kie_market' | 'kie_veo' | 'openai' | 'fal' | 'laozhang';

export type PhotoPricing =
  | number
  | { [key in PhotoQuality]?: number }
  | { [resolution: string]: number };

export type VideoPricing =
  | number
  | { [key in VideoQuality]?: { [duration: string]: number } }
  | { [mode: string]: { [duration: string]: number } }
  | { [duration: string]: number | { audio?: number; no_audio?: number } };

export interface PhotoModelConfig {
  id: string;
  name: string;
  apiId: string;
  apiId2k?: string;
  apiId4k?: string;
  type: 'photo';
  provider: KieProvider;
  description: string;
  shortDescription?: string;
  rank: number;
  featured: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  supportsI2i: boolean;
  pricing: PhotoPricing;
  qualityOptions?: PhotoQuality[];
  aspectRatios: string[];
  fixedResolution?: '1K' | '2K' | '4K' | '8K';
  shortLabel?: string;
}

export interface VideoModelVariant {
  id: string;
  name: string;
  apiId: string;
  apiIdI2v?: string;
  apiIdV2v?: string;
  pricing: VideoPricing;
  perSecondPricing?: { [resolution: string]: number };
  modes?: string[];
  durationOptions?: (number | string)[];
  resolutionOptions?: string[];
  aspectRatios?: string[];
  soundOptions?: string[];
}

export interface VideoModelConfig {
  id: string;
  name: string;
  apiId: string;
  apiIdI2v?: string;
  apiIdV2v?: string;
  apiIdFast?: string;
  apiIdLandscape?: string;
  apiIdLandscapeFast?: string;
  apiIdVideo2?: string;
  apiId15s?: string;
  type: 'video';
  provider: KieProvider;
  description: string;
  rank: number;
  featured: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'ultra';
  supportsI2v: boolean;
  supportsAudio?: boolean;
  supportsStartEnd?: boolean;
  supportsStoryboard?: boolean;
  pricing: VideoPricing;
  modelVariants?: VideoModelVariant[];
  modes: VideoMode[];
  durationOptions: (number | string)[];
  qualityOptions?: VideoQuality[];
  resolutionOptions?: string[];
  aspectRatios: string[];
  fixedDuration?: number;
  shortLabel?: string;
}

export type ModelConfig = PhotoModelConfig | VideoModelConfig;
