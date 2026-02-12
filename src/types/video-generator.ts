// Types for Video Generator

// Video generation modes
export type VideoMode = 'text' | 'image' | 'reference' | 'v2v' | 'motion' | 'edit' | 'extend';
export type VideoQuality = '720p' | '1080p' | '4K' | 'standard' | 'pro' | 'master';
export type VideoStatus = 'idle' | 'queued' | 'processing' | 'success' | 'error';
export type TabType = 'video' | 'motion' | 'edit' | 'music';

export interface KlingO3Shot {
  prompt: string;
  duration: number;
}

export interface VideoGenerationParams {
  prompt: string;
  mode: VideoMode;
  selectedModel: string;
  duration: number;
  quality: VideoQuality;
  aspectRatio: string;
  withSound: boolean;
  style?: string;
  cameraMotion?: string;
  stylePreset?: string;
  motionStrength?: number;

  // Basic modes (text, image, reference)
  referenceImage?: string | null;
  referenceImages?: string[] | null; // Veo multiple reference images
  referenceVideo?: string | null;

  // Start/End Frame mode (extends reference)
  startFrame?: string | null;
  endFrame?: string | null;

  // V2V mode
  v2vInputVideo?: string | null;

  // Motion Control mode (Kling Motion)
  motionVideo?: string | null;
  characterImage?: string | null;
  characterOrientation?: 'image' | 'video';
  videoDuration?: number;
  motionSeconds?: number;

  // Video Edit mode (Kling O1 Edit)
  editVideo?: string | null;
  editRefImage?: string | null;
  keepAudio?: boolean;

  // Extend mode (Veo 3.1 продление видео)
  sourceGenerationId?: string | null;
  taskId?: string | null;

  // Advanced settings (Phase 2)
  negativePrompt?: string;
  cfgScale?: number;
  cameraControl?: string; // JSON string
  qualityTier?: 'standard' | 'pro' | 'master';
  modelVariant?: string;
  resolution?: string; // e.g., "1080p_multi" for WAN
  soundPreset?: string; // WAN sound presets
  multiPrompt?: Array<string | KlingO3Shot>; // Kling O3 multishot prompts
  shotType?: 'single' | 'customize'; // Kling O3 shot type
  generateAudio?: boolean; // Kling O3 audio toggle
}

export interface VideoGenerationState {
  isGenerating: boolean;
  jobId: string | null;
  progress: number;
  status: VideoStatus;
  resultUrl: string | null;
  error: string | null;
}

export interface VideoGenerationResult {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing';
  estimatedTime?: number;
  creditCost: number;
  generationId?: string;
  provider?: string;
  kind?: 'video';
}

export interface VideoJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  error?: string;
  estimatedTime?: number;
}

// Phase 3: Job Queue
export type JobViewMode = 'grid' | 'list';

export interface VideoJob {
  jobId: string;
  generationId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt: string;
  modelId: string;
  modelName?: string;
  mode: VideoMode;
  duration: number;
  quality: VideoQuality;
  aspectRatio: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt?: string;
  estimatedTime?: number;
}
