// ===== GENERATOR BUILDER TYPES =====

export type ContentType = "photo" | "video" | "product";
export type Speed = "fast" | "medium" | "slow";
export type Quality = "standard" | "high" | "ultra";

// Mode IDs
export type PhotoModeId = "t2i" | "i2i" | "inpaint" | "two_refs";
export type VideoModeId = "t2v" | "i2v" | "start_end" | "storyboard";
export type ProductModeId = "t2i" | "i2i";
export type ModeId = PhotoModeId | VideoModeId | ProductModeId;

// Reference slot configuration
export interface RefSlotConfig {
  a?: string; // Label for ref A
  b?: string; // Label for ref B
}

export interface RequiredRefs {
  a: boolean;
  b: boolean;
}

// Output controls configuration
export interface OutputControls {
  aspectRatio: boolean;
  variants: boolean;
  duration?: boolean;
  fps?: boolean;
}

// Advanced controls that can be enabled per mode
export interface AdvancedControls {
  seed?: boolean;
  guidance?: boolean;      // CFG Scale
  steps?: boolean;
  stylize?: boolean;
  motionStrength?: boolean; // For video
  negativePrompt?: boolean;
}

// Mode specification
export interface ModeSpec {
  id: ModeId;
  label: string;
  description?: string;
  refSlots: 0 | 1 | 2;
  refLabels: RefSlotConfig;
  requiredRefs: RequiredRefs;
  showPrompt: boolean;
  outputControls: OutputControls;
  advancedControls: AdvancedControls;
  comingSoon?: boolean; // For features not yet implemented
}

// Model specification
export interface ModelSpec {
  id: string;
  name: string;
  contentType: ContentType;
  rank: number;
  credits: number | null;
  speed: Speed;
  quality: Quality;
  description: string;
  featured?: boolean;
  modes: ModeSpec[];
  hidden?: boolean;
}

// Aspect ratio options
export interface AspectRatioOption {
  id: string;
  label: string;
  icon: string;
  ratio: number; // width/height
}

// Duration options for video
export interface DurationOption {
  seconds: number;
  label: string;
}

// Form state
export interface GeneratorFormState {
  contentType: ContentType;
  modelId: string;
  modeId: ModeId;
  prompt: string;
  negativePrompt: string;
  refA: File | string | null; // File or URL
  refB: File | string | null;
  aspectRatio: string;
  variants: number;
  duration: number; // seconds
  fps: number;
  seed: number | null;
  guidance: number;
  steps: number;
  stylize: number;
  motionStrength: number;
}

// Generation payload for API
export interface GenerationPayload {
  modelId: string;
  modeId: ModeId;
  prompt: string;
  negativePrompt?: string;
  references?: {
    a?: string; // Base64 or URL
    b?: string;
  };
  aspectRatio: string;
  variants: number;
  duration?: number;
  fps?: number;
  seed?: number;
  guidance?: number;
  steps?: number;
  stylize?: number;
  motionStrength?: number;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

