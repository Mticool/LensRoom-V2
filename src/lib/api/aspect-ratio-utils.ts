/**
 * Утилиты для работы с aspect ratio
 * Обеспечивают консистентность дефолтных значений для всех моделей
 */

import { getImageModelSettings, getVideoModelSettings } from '@/config/kie-api-settings';

/**
 * Normalize common aspect ratio formats into canonical "W:H".
 *
 * Accepts:
 * - "9:16", "9 / 16"
 * - "9.16" (UI/locale shorthand)
 * - "9x16", "9×16"
 *
 * Non-numeric values (e.g. "portrait", "landscape", "auto") are returned trimmed as-is.
 */
export function normalizeAspectRatio(input: string | undefined | null): string | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;

  // Keep non-numeric presets as-is (common for video models).
  const lower = raw.toLowerCase();
  if (lower === "auto" || lower === "portrait" || lower === "landscape" || lower === "source") return lower;

  // Normalize separators (:, /, ., x, ×)
  const m = raw.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
  if (!m) return raw;

  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return raw;

  return `${w}:${h}`;
}

/**
 * Получить дефолтное значение aspect_ratio для модели из конфига
 * Если в конфиге не указано, возвращает '1:1'
 */
export function getDefaultAspectRatio(modelId: string): string {
  const modelConfig = getImageModelSettings(modelId);
  const defaultFromConfig = modelConfig?.settings?.aspect_ratio?.default as string;
  
  if (defaultFromConfig) {
    return defaultFromConfig;
  }
  
  // Fallback для моделей без настройки aspect_ratio
  return '1:1';
}

/**
 * Получить финальное значение aspect_ratio с учётом дефолта модели
 * @param aspectRatio - значение из запроса (может быть undefined)
 * @param modelId - ID модели для получения дефолта
 * @returns финальное значение aspect_ratio
 */
export function resolveAspectRatio(aspectRatio: string | undefined, modelId: string): string {
  const normalized = normalizeAspectRatio(aspectRatio);
  if (normalized) return normalized;
  
  return getDefaultAspectRatio(modelId);
}

/**
 * Логирование разрешения aspect_ratio для отладки
 */
export function logAspectRatioResolution(
  received: string | undefined,
  final: string,
  modelId: string,
  provider: string
): void {
  const modelConfig = getImageModelSettings(modelId);
  const defaultFromConfig = modelConfig?.settings?.aspect_ratio?.default;
  
  console.log(`[API ${provider}] Aspect ratio resolution:`, {
    received,
    defaultFromConfig,
    final,
    modelId,
    usedDefault: !received
  });
}

// ===== ВИДЕО МОДЕЛИ =====

/**
 * Получить дефолтное значение aspect_ratio для видео модели из конфига
 * Если в конфиге не указано, возвращает '16:9'
 */
export function getDefaultVideoAspectRatio(modelId: string): string {
  const modelConfig = getVideoModelSettings(modelId);
  const defaultFromConfig = modelConfig?.settings?.aspect_ratio?.default as string;
  
  if (defaultFromConfig) {
    return defaultFromConfig;
  }
  
  // Fallback для моделей без настройки aspect_ratio
  return '16:9';
}

/**
 * Получить финальное значение aspect_ratio для видео с учётом дефолта модели
 * @param aspectRatio - значение из запроса (может быть undefined)
 * @param modelId - ID модели для получения дефолта
 * @returns финальное значение aspect_ratio
 */
export function resolveVideoAspectRatio(aspectRatio: string | undefined, modelId: string): string {
  const normalized = normalizeAspectRatio(aspectRatio);
  if (normalized) return normalized;
  
  return getDefaultVideoAspectRatio(modelId);
}

/**
 * Логирование разрешения aspect_ratio для видео
 */
export function logVideoAspectRatioResolution(
  received: string | undefined,
  final: string,
  modelId: string,
  provider: string
): void {
  const modelConfig = getVideoModelSettings(modelId);
  const defaultFromConfig = modelConfig?.settings?.aspect_ratio?.default;
  
  console.log(`[API ${provider} Video] Aspect ratio resolution:`, {
    received,
    defaultFromConfig,
    final,
    modelId,
    usedDefault: !received
  });
}
