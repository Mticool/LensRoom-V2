/**
 * Model Capabilities Checker
 * Проверяет и кеширует поддерживаемые возможности каждой модели (aspect ratios, quality options)
 */

import { getModelById } from '@/config/models';

export interface ModelCapabilities {
  aspectRatios: string[];
  qualityOptions: string[];
  supportsVariants: boolean;
  supportsI2i: boolean;
}

const CACHE_KEY = 'lensroom_model_capabilities_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

interface CachedCapabilities {
  [modelId: string]: {
    data: ModelCapabilities;
    timestamp: number;
  };
}

/**
 * Получить capabilities модели из кеша или API
 */
export async function getModelCapabilities(modelId: string): Promise<ModelCapabilities> {
  // 1. Проверить кеш в localStorage
  const cached = getCachedCapabilities(modelId);
  if (cached) {
    console.log('[Capabilities] Using cached data for', modelId);
    return cached;
  }

  // 2. Попытаться получить из API
  try {
    console.log('[Capabilities] Fetching from API for', modelId);
    const apiCapabilities = await fetchCapabilitiesFromAPI(modelId);
    
    // Сохранить в кеш
    setCachedCapabilities(modelId, apiCapabilities);
    return apiCapabilities;
  } catch (error) {
    console.warn('[Capabilities] API fetch failed, using config fallback:', error);
  }

  // 3. Fallback на данные из конфига
  const capabilities = getCapabilitiesFromConfig(modelId);
  
  // Сохранить fallback в кеш (чтобы не спамить API)
  setCachedCapabilities(modelId, capabilities);
  
  return capabilities;
}

/**
 * Получить capabilities из localStorage кеша
 */
function getCachedCapabilities(modelId: string): ModelCapabilities | null {
  if (typeof window === 'undefined') return null;

  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;

    const cache: CachedCapabilities = JSON.parse(cacheStr);
    const cached = cache[modelId];

    if (!cached) return null;

    // Проверить expiry
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_EXPIRY) {
      console.log('[Capabilities] Cache expired for', modelId);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error('[Capabilities] Failed to read cache:', error);
    return null;
  }
}

/**
 * Сохранить capabilities в localStorage кеш
 */
function setCachedCapabilities(modelId: string, capabilities: ModelCapabilities): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    const cache: CachedCapabilities = cacheStr ? JSON.parse(cacheStr) : {};

    cache[modelId] = {
      data: capabilities,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('[Capabilities] Cached for', modelId);
  } catch (error) {
    console.error('[Capabilities] Failed to write cache:', error);
  }
}

/**
 * Запросить capabilities из API
 */
async function fetchCapabilitiesFromAPI(modelId: string): Promise<ModelCapabilities> {
  const response = await fetch(`/api/models/${modelId}/capabilities`);
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Получить capabilities из конфига models.ts (fallback)
 */
function getCapabilitiesFromConfig(modelId: string): ModelCapabilities {
  const model = getModelById(modelId);

  if (!model || model.type !== 'photo') {
    console.warn('[Capabilities] Model not found or not a photo model:', modelId);
    return {
      aspectRatios: ['1:1'],
      qualityOptions: [],
      supportsVariants: true,
      supportsI2i: false,
    };
  }

  return {
    aspectRatios: model.aspectRatios || ['1:1'],
    qualityOptions: model.qualityOptions || [],
    supportsVariants: true, // Все модели поддерживают variants 1-4
    supportsI2i: model.supportsI2i,
  };
}

/**
 * Очистить весь кеш capabilities
 */
export function clearCapabilitiesCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
  console.log('[Capabilities] Cache cleared');
}

/**
 * Очистить кеш для конкретной модели
 */
export function clearModelCapabilitiesCache(modelId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return;

    const cache: CachedCapabilities = JSON.parse(cacheStr);
    delete cache[modelId];

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('[Capabilities] Cache cleared for', modelId);
  } catch (error) {
    console.error('[Capabilities] Failed to clear cache:', error);
  }
}
