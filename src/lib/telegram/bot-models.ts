/**
 * Bot Models Configuration
 *
 * Transforms models from config/models.ts into a simplified format for Telegram bot.
 * Uses pricing.ts for star costs.
 */

import { PHOTO_MODELS, VIDEO_MODELS, type PhotoModelConfig, type VideoModelConfig, type KieProvider } from '@/config/models';
import { getPriceStars } from '@/lib/pricing/pricing';

// ========================================
// Types
// ========================================

export interface BotPhotoModel {
  id: string;
  name: string;
  apiModel: string;
  provider: KieProvider;
  emoji: string;
  cost: number; // Default cost in stars
  badge: string;
  supportsI2i: boolean;
  qualityOptions: string[];
  aspectRatios: string[];
}

export interface BotVideoModel {
  id: string;
  name: string;
  apiModel: string;
  provider: KieProvider;
  emoji: string;
  cost: number; // Default cost in stars
  baseCost: number; // Minimum cost (same as cost for display)
  badge: string;
  supportsI2v: boolean;
  supportsAudio: boolean;
  durationOptions: (number | string)[];
  aspectRatios: string[];
  resolutionOptions?: string[];
  defaultDuration: number;
  defaultResolution: string;
}

export interface BotAudioModel {
  id: string;
  name: string;
  apiModel: string;
  emoji: string;
  cost: number;
  badge: string;
}

// ========================================
// Emoji mapping for models
// ========================================

const PHOTO_EMOJIS: Record<string, string> = {
  'nano-banana': '🍌',
  'nano-banana-pro': '⭐',
  'flux-2-pro': '⚡',
  'gpt-image': '🧠',
  'grok-imagine': '🌶️',
  'seedream-4.5': '✨',
  'z-image-turbo': '📐',
  'topaz-upscale': '🔍',
  'ideogram-character': '👤',
};

const VIDEO_EMOJIS: Record<string, string> = {
  'veo-3.1-fast': '🎬',
  'veo-3.1': '🎬',
  'kling-2.5': '⚡',
  'kling-2.6': '🎥',
  'kling-2.1': '🏆',
  'kling-o1': '🎯',
  'grok-video': '🌶️',
  'sora-2': '📽️',
  'wan-2.6': '🎬',
  'minimax': '🎭',
};

const PHOTO_BADGES: Record<string, string> = {
  'nano-banana': 'Быстрый',
  'nano-banana-pro': 'Премиум 4K',
  'flux-2-pro': 'Популярный',
  'gpt-image': 'OpenAI',
  'grok-imagine': 'xAI 🌶️',
  'seedream-4.5': '4K',
  'z-image-turbo': 'Бюджет',
  'topaz-upscale': 'Upscale',
  'ideogram-character': 'Персонаж',
};

const VIDEO_BADGES: Record<string, string> = {
  'veo-3.1-fast': 'Google Fast',
  'veo-3.1': 'Google HD',
  'kling-2.5': 'Trending',
  'kling-2.6': 'Audio',
  'kling-2.1': 'Master',
  'kling-o1': 'Premium',
  'grok-video': 'xAI',
  'sora-2': 'OpenAI',
  'wan-2.6': 'Motion',
  'minimax': 'Fast',
};

// ========================================
// Get default price for a model
// ========================================

function getDefaultPhotoPrice(model: PhotoModelConfig): number {
  // Try to get from pricing.ts
  try {
    // Build a simple SKU for default pricing
    const sku = `${model.id.replace(/-/g, '_')}:image`;
    const price = getPriceStars(sku);
    if (price > 0) return price;
  } catch {}

  // Fallback to model's pricing config
  if (typeof model.pricing === 'number') {
    return model.pricing;
  }

  // Get first quality option price
  const pricing = model.pricing as Record<string, number>;
  const firstKey = Object.keys(pricing)[0];
  return pricing[firstKey] || 10;
}

function getDefaultVideoPrice(model: VideoModelConfig): number {
  // Try to get from pricing.ts
  try {
    // Build a simple SKU for default pricing
    const sku = `${model.id.replace(/-/g, '_').replace(/\./g, '_')}:5s:720p`;
    const price = getPriceStars(sku);
    if (price > 0) return price;
  } catch {}

  // Fallback to model's pricing config
  if (typeof model.pricing === 'number') {
    return model.pricing;
  }

  // Get first duration option price
  const pricing = model.pricing as Record<string, any>;
  const firstKey = Object.keys(pricing)[0];
  const firstValue = pricing[firstKey];
  if (typeof firstValue === 'number') return firstValue;
  if (typeof firstValue === 'object') {
    const innerFirstKey = Object.keys(firstValue)[0];
    return firstValue[innerFirstKey] || 50;
  }
  return 50;
}

// ========================================
// Transform models for bot
// ========================================

export function getBotPhotoModels(): BotPhotoModel[] {
  return PHOTO_MODELS
    .filter(m => m.featured)
    .sort((a, b) => a.rank - b.rank)
    .map(m => ({
      id: m.id,
      name: m.name,
      apiModel: m.apiId,
      provider: m.provider,
      emoji: PHOTO_EMOJIS[m.id] || '🎨',
      cost: getDefaultPhotoPrice(m),
      badge: PHOTO_BADGES[m.id] || m.shortLabel || '',
      supportsI2i: m.supportsI2i,
      qualityOptions: m.qualityOptions || ['balanced'],
      aspectRatios: m.aspectRatios,
    }));
}

export function getBotVideoModels(): BotVideoModel[] {
  return VIDEO_MODELS
    .filter(m => m.featured)
    .sort((a, b) => a.rank - b.rank)
    .map(m => {
      const cost = getDefaultVideoPrice(m);
      const defaultDuration = typeof m.durationOptions[0] === 'number'
        ? m.durationOptions[0]
        : parseInt(String(m.durationOptions[0])) || 5;
      const defaultResolution = m.resolutionOptions?.[0] || '720p';

      return {
        id: m.id,
        name: m.name,
        apiModel: m.apiId,
        provider: m.provider,
        emoji: VIDEO_EMOJIS[m.id] || '🎬',
        cost,
        baseCost: cost,
        badge: VIDEO_BADGES[m.id] || m.shortLabel || '',
        supportsI2v: m.supportsI2v,
        supportsAudio: m.supportsAudio || m.supportsAudioGeneration || false,
        durationOptions: m.durationOptions,
        aspectRatios: m.aspectRatios,
        resolutionOptions: m.resolutionOptions,
        defaultDuration,
        defaultResolution,
      };
    });
}

// Audio models (static for now)
export function getBotAudioModels(): BotAudioModel[] {
  return [
    { id: 'suno', apiModel: 'suno/v4', name: 'Suno AI', emoji: '🎵', cost: 12, badge: 'Музыка' },
  ];
}

// ========================================
// Find model by ID
// ========================================

export function findPhotoModel(id: string): BotPhotoModel | undefined {
  return getBotPhotoModels().find(m => m.id === id);
}

export function findVideoModel(id: string): BotVideoModel | undefined {
  return getBotVideoModels().find(m => m.id === id);
}

export function findAudioModel(id: string): BotAudioModel | undefined {
  return getBotAudioModels().find(m => m.id === id);
}

export function findAnyModel(id: string): BotPhotoModel | BotVideoModel | BotAudioModel | undefined {
  return findPhotoModel(id) || findVideoModel(id) || findAudioModel(id);
}

// ========================================
// Get price for specific options
// ========================================

export function getPhotoPrice(
  modelId: string,
  quality?: string,
  aspectRatio?: string
): number {
  const model = PHOTO_MODELS.find(m => m.id === modelId);
  if (!model) return 0;

  // Build SKU
  let sku = modelId.replace(/-/g, '_');
  if (quality) {
    sku += `:${quality}`;
  } else {
    sku += ':image';
  }

  try {
    const price = getPriceStars(sku);
    if (price > 0) return price;
  } catch {}

  // Fallback
  return getDefaultPhotoPrice(model);
}

export function getVideoPrice(
  modelId: string,
  duration?: number | string,
  resolution?: string,
  withAudio?: boolean
): number {
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) return 0;

  // Build SKU
  let sku = modelId.replace(/-/g, '_').replace(/\./g, '_');
  if (duration) {
    sku += `:${duration}s`;
  }
  if (resolution) {
    sku += `:${resolution}`;
  }
  if (withAudio) {
    sku += ':audio';
  }

  try {
    const price = getPriceStars(sku);
    if (price > 0) return price;
  } catch {}

  // Fallback
  return getDefaultVideoPrice(model);
}

// ========================================
// Get original model config (for API calls)
// ========================================

export function getOriginalPhotoModel(id: string): PhotoModelConfig | undefined {
  return PHOTO_MODELS.find(m => m.id === id);
}

export function getOriginalVideoModel(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS.find(m => m.id === id);
}
