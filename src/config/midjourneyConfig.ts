/**
 * Midjourney Configuration
 * KIE.ai API integration for Midjourney
 * 
 * Docs: https://kie.ai/model-preview/features/mj-api
 */

// ===== TYPES =====

export type MjSpeed = 'relaxed' | 'fast' | 'turbo';
export type MjVersion = '7' | '6.1' | '6' | '5.2' | '5.1' | 'niji6';
export type MjTaskType = 'text-to-image' | 'image-to-image' | 'image-to-video';

export interface MjSettings {
  speed: MjSpeed;
  version: MjVersion;
  stylization: number; // 0-1000
  weirdness: number; // 0-3000
  variety: number; // 0-100
  enableTranslation: boolean;
}

export interface MjAspectRatio {
  id: string;
  label: string;
  ratio: number;
}

// ===== CONSTANTS =====

export const MJ_SPEEDS: { id: MjSpeed; label: string; description: string; costMultiplier: number }[] = [
  { id: 'relaxed', label: 'Relaxed', description: 'Медленно, экономно', costMultiplier: 0.5 },
  { id: 'fast', label: 'Fast', description: 'Стандартная скорость', costMultiplier: 1.0 },
  { id: 'turbo', label: 'Turbo', description: 'Максимальная скорость', costMultiplier: 2.0 },
];

export const MJ_VERSIONS: { id: MjVersion; label: string; description: string }[] = [
  { id: '7', label: 'V7', description: 'Новейшая версия, максимальное качество' },
  { id: '6.1', label: 'V6.1', description: 'Улучшенная детализация' },
  { id: '6', label: 'V6', description: 'Стабильная версия' },
  { id: '5.2', label: 'V5.2', description: 'Классический стиль MJ' },
  { id: '5.1', label: 'V5.1', description: 'Фотореалистичный стиль' },
  { id: 'niji6', label: 'Niji 6', description: 'Аниме/манга стиль' },
];

export const MJ_ASPECT_RATIOS: MjAspectRatio[] = [
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16/9 },
  { id: '9:16', label: '9:16', ratio: 9/16 },
  { id: '4:3', label: '4:3', ratio: 4/3 },
  { id: '3:4', label: '3:4', ratio: 3/4 },
  { id: '3:2', label: '3:2', ratio: 3/2 },
  { id: '2:3', label: '2:3', ratio: 2/3 },
  { id: '5:6', label: '5:6', ratio: 5/6 },
  { id: '6:5', label: '6:5', ratio: 6/5 },
  { id: '2:1', label: '2:1', ratio: 2 },
  { id: '1:2', label: '1:2', ratio: 0.5 },
];

// ===== DEFAULT SETTINGS =====

export const MJ_DEFAULT_SETTINGS: MjSettings = {
  speed: 'fast',
  version: '7',
  stylization: 100, // Default MJ stylization
  weirdness: 0,
  variety: 0,
  enableTranslation: true, // Auto-translate Russian prompts
};

// ===== PARAMETER LIMITS =====

export const MJ_LIMITS = {
  stylization: { min: 0, max: 1000, step: 10, default: 100 },
  weirdness: { min: 0, max: 3000, step: 50, default: 0 },
  variety: { min: 0, max: 100, step: 5, default: 0 },
} as const;

// ===== PRICING =====

// Base cost in stars (for fast speed)
export const MJ_BASE_COST = 10;

export function calculateMjCost(settings: MjSettings): number {
  const speedMultiplier = MJ_SPEEDS.find(s => s.id === settings.speed)?.costMultiplier || 1;
  return Math.ceil(MJ_BASE_COST * speedMultiplier);
}

// ===== API MODEL MAPPING =====

export function getMjApiModel(version: MjVersion): string {
  // KIE API model format for Midjourney
  const versionMap: Record<MjVersion, string> = {
    '7': 'midjourney/v7-text-to-image',
    '6.1': 'midjourney/v6.1-text-to-image',
    '6': 'midjourney/v6-text-to-image',
    '5.2': 'midjourney/v5.2-text-to-image',
    '5.1': 'midjourney/v5.1-text-to-image',
    'niji6': 'midjourney/niji6-text-to-image',
  };
  return versionMap[version] || 'midjourney/v7-text-to-image';
}

// ===== HELPER FUNCTIONS =====

export function formatMjVersion(version: MjVersion): string {
  const v = MJ_VERSIONS.find(v => v.id === version);
  return v?.label || `V${version}`;
}

export function validateMjSettings(settings: Partial<MjSettings>): MjSettings {
  return {
    speed: settings.speed || MJ_DEFAULT_SETTINGS.speed,
    version: settings.version || MJ_DEFAULT_SETTINGS.version,
    stylization: Math.min(Math.max(settings.stylization ?? MJ_DEFAULT_SETTINGS.stylization, MJ_LIMITS.stylization.min), MJ_LIMITS.stylization.max),
    weirdness: Math.min(Math.max(settings.weirdness ?? MJ_DEFAULT_SETTINGS.weirdness, MJ_LIMITS.weirdness.min), MJ_LIMITS.weirdness.max),
    variety: Math.min(Math.max(settings.variety ?? MJ_DEFAULT_SETTINGS.variety, MJ_LIMITS.variety.min), MJ_LIMITS.variety.max),
    enableTranslation: settings.enableTranslation ?? MJ_DEFAULT_SETTINGS.enableTranslation,
  };
}

// ===== PROMPT HELPERS =====

/**
 * Build MJ-optimized prompt with parameters
 */
export function buildMjPrompt(
  userPrompt: string,
  settings: MjSettings,
  aspectRatio?: string
): string {
  const prompt = userPrompt.trim();
  
  // Midjourney uses --parameters in prompt
  // But KIE API accepts them as separate fields, so we just return clean prompt
  return prompt;
}

/**
 * Parse MJ parameters from user prompt (--v, --s, --w, etc.)
 * Returns cleaned prompt and extracted params
 */
export function parseMjPrompt(rawPrompt: string): {
  cleanPrompt: string;
  extractedParams: Partial<MjSettings & { aspectRatio?: string }>;
} {
  let cleanPrompt = rawPrompt;
  const extractedParams: Partial<MjSettings & { aspectRatio?: string }> = {};

  // Extract --v (version)
  const versionMatch = rawPrompt.match(/--v\s*([\d.]+)/i);
  if (versionMatch) {
    const v = versionMatch[1];
    if (['7', '6.1', '6', '5.2', '5.1'].includes(v)) {
      extractedParams.version = v as MjVersion;
    }
    cleanPrompt = cleanPrompt.replace(/--v\s*[\d.]+/gi, '');
  }

  // Extract --niji
  if (/--niji\s*6?/i.test(rawPrompt)) {
    extractedParams.version = 'niji6';
    cleanPrompt = cleanPrompt.replace(/--niji\s*6?/gi, '');
  }

  // Extract --s (stylization)
  const stylizeMatch = rawPrompt.match(/--s(?:tylize)?\s*(\d+)/i);
  if (stylizeMatch) {
    extractedParams.stylization = parseInt(stylizeMatch[1], 10);
    cleanPrompt = cleanPrompt.replace(/--s(?:tylize)?\s*\d+/gi, '');
  }

  // Extract --w (weirdness)
  const weirdMatch = rawPrompt.match(/--w(?:eird)?\s*(\d+)/i);
  if (weirdMatch) {
    extractedParams.weirdness = parseInt(weirdMatch[1], 10);
    cleanPrompt = cleanPrompt.replace(/--w(?:eird)?\s*\d+/gi, '');
  }

  // Extract --ar (aspect ratio)
  const arMatch = rawPrompt.match(/--ar\s*([\d:]+)/i);
  if (arMatch) {
    extractedParams.aspectRatio = arMatch[1];
    cleanPrompt = cleanPrompt.replace(/--ar\s*[\d:]+/gi, '');
  }

  // Clean up extra whitespace
  cleanPrompt = cleanPrompt.replace(/\s+/g, ' ').trim();

  return { cleanPrompt, extractedParams };
}


