/**
 * Video Studio Types
 * Централизованные типы для видео-компонентов
 */

import type { VideoMode, VideoQuality } from "@/config/models";

// ===== STATUS & MODES =====

export type JobStatus = "queued" | "processing" | "success" | "failed" | "cancelled";

export type StudioMode = Extract<VideoMode, "t2v" | "i2v" | "start_end" | "v2v">;

export type StudioAspect = string;

export type UploadTileKind = "motion" | "character" | "editVideo" | "editImage";

// ===== JOB PARAMS =====

export type VideoJobParams = {
  model: string;
  modelVariant?: string;
  mode: StudioMode;
  prompt: string;
  negativePrompt?: string;
  duration?: number | string;
  quality?: VideoQuality | string;
  resolution?: string;
  aspectRatio?: StudioAspect;
  audio?: boolean;
  soundPreset?: string;
  // Motion Control (Kling 2.6)
  referenceVideo?: string;
  referenceImage?: string;
  videoDuration?: number;
  autoTrim?: boolean;
  // Edit Video (Kling O1 Edit)
  videoUrl?: string;
  keepAudio?: boolean;
  startImage?: string;
  endImage?: string;
};

// ===== JOB CARD =====

export type VideoJobCard = {
  localId: string;
  createdAt: number;
  status: JobStatus;
  progress: number;
  error?: string | null;
  // Remote tracking
  jobId?: string | null;
  provider?: string | null;
  // Result
  resultUrl?: string | null;
  // For display/retry
  params: VideoJobParams;
};

// ===== CONSTANTS =====

export const MODEL_IDS = {
  VEO_3_1: "veo-3.1",
  KLING_MOTION_CONTROL: "kling-motion-control",
  KLING_O1_EDIT: "kling-o1-edit",
  WAN: "wan",
  KLING: "kling",
} as const;

export const EXCLUDED_MODEL_IDS = new Set<string>([
  "sora-storyboard",
  "kling-ai-avatar",
]);
