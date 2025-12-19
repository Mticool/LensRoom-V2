/**
 * Models Configuration
 * 
 * Source of truth for all AI models
 */

// ===== TYPES =====

export type KieModelKind = 'image' | 'video';
export type KieModelMode = 't2i' | 'i2i' | 't2v' | 'i2v';

export interface KieModelInputSchema {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  resolution?: string;
  width?: number;
  height?: number;
  duration?: number | string;
  imageUrl?: string;
  imageUrls?: string[];
  steps?: number;
  seed?: number;
  guidanceScale?: number;
  sound?: boolean;
  [key: string]: unknown;
}

export interface KieModel {
  id: string; // our internal ID
  name: string; // display name
  apiModel: string; // actual model string for KIE API
  kind: KieModelKind;
  mode: KieModelMode;
  starsCost: number; // base cost in stars
  inputSchema: Partial<KieModelInputSchema>; // required/optional fields
  description?: string;
  requiresPremium?: boolean; // if model needs premium subscription
}

// ===== MODEL DEFINITIONS =====

export const KIE_MODELS: Record<string, KieModel> = {
  // ===== IMAGE MODELS =====
  
  seedream_45_t2i: {
    id: 'seedream_45_t2i',
    name: 'Seedream 4.5',
    apiModel: 'seedream/4.5-text-to-image',
    kind: 'image',
    mode: 't2i',
    starsCost: 8,
    requiresPremium: true,
    description: 'Premium фото модель с высокой детализацией',
    inputSchema: {
      prompt: '',
      negativePrompt: '',
      aspectRatio: '16:9', // "1:1", "16:9", "9:16", "3:2", "2:3"
      steps: 30,
      seed: -1,
      guidanceScale: 7.5,
    },
  },

  flux2_pro_t2i: {
    id: 'flux2_pro_t2i',
    name: 'FLUX.2 Pro',
    apiModel: 'flux-2/pro-text-to-image',
    kind: 'image',
    mode: 't2i',
    starsCost: 12,
    requiresPremium: true,
    description: 'FLUX.2 Pro - премиум качество, требует resolution + aspect_ratio',
    inputSchema: {
      prompt: '',
      negativePrompt: '',
      resolution: '2K', // "1K" or "2K"
      aspectRatio: '16:9', // required for flux-2 models
    },
  },

  // ===== VIDEO MODELS =====

  kling_26_t2v: {
    id: 'kling_26_t2v',
    name: 'Kling 2.6',
    apiModel: 'kling-2.6/text-to-video',
    kind: 'video',
    mode: 't2v',
    starsCost: 25,
    requiresPremium: true,
    description: 'Kling 2.6 text-to-video - премиум видео из текста',
    inputSchema: {
      prompt: '',
      duration: 5, // 5 or 10 (seconds, but sent as STRING)
      aspectRatio: '16:9', // "1:1", "16:9", "9:16"
      sound: false,
    },
  },

  bytedance_v1pro_i2v: {
    id: 'bytedance_v1pro_i2v',
    name: 'Bytedance V1 Pro',
    apiModel: 'bytedance/v1-pro-image-to-video',
    kind: 'video',
    mode: 'i2v',
    starsCost: 30,
    requiresPremium: true,
    description: 'Bytedance V1 Pro - image-to-video',
    inputSchema: {
      imageUrl: '',
      prompt: '',
      duration: 5, // 5 or 10
      aspectRatio: '16:9',
      resolution: '720p', // "480p", "720p", "1080p"
    },
  },
};

// ===== HELPER FUNCTIONS =====

export function getKieModel(id: string): KieModel | undefined {
  return KIE_MODELS[id];
}

export function getKieModelsByKind(kind: KieModelKind): KieModel[] {
  return Object.values(KIE_MODELS).filter(m => m.kind === kind);
}

export function getKieModelsByMode(mode: KieModelMode): KieModel[] {
  return Object.values(KIE_MODELS).filter(m => m.mode === mode);
}

export function getAllKieModels(): KieModel[] {
  return Object.values(KIE_MODELS);
}

// ===== VALIDATION =====

export function validateModelInput(
  modelId: string,
  input: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const model = getKieModel(modelId);
  if (!model) {
    return { valid: false, errors: [`Model ${modelId} not found`] };
  }

  const errors: string[] = [];
  const schema = model.inputSchema;

  // Check required fields
  if (schema.prompt !== undefined && !input.prompt) {
    errors.push('prompt is required');
  }

  if (model.mode === 'i2v' && schema.imageUrl !== undefined && !input.imageUrl) {
    errors.push('imageUrl is required for image-to-video');
  }

  return { valid: errors.length === 0, errors };
}

// ===== DEFAULTS =====

export const KIE_DEFAULTS = {
  pollingInterval: 3000, // ms
  maxPollingAttempts: 60, // 3 minutes
  callbackTimeout: 300000, // 5 minutes
} as const;


