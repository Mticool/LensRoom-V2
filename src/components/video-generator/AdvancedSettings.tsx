'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedSettingsProps {
  // Negative Prompts
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  supportsNegativePrompt?: boolean;

  // Model Variant
  modelVariant: string;
  onModelVariantChange: (value: string) => void;
  availableVariants?: string[];

  // Resolution (for special cases like WAN multi-shot)
  resolution: string;
  onResolutionChange: (value: string) => void;
  availableResolutions?: string[];

  // Sound Presets (for WAN)
  soundPreset: string;
  onSoundPresetChange: (value: string) => void;
  availableSoundPresets?: string[];
}

export function AdvancedSettings({
  negativePrompt,
  onNegativePromptChange,
  supportsNegativePrompt = false,
  modelVariant,
  onModelVariantChange,
  availableVariants = [],
  resolution,
  onResolutionChange,
  availableResolutions = [],
  soundPreset,
  onSoundPresetChange,
  availableSoundPresets = [],
}: AdvancedSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if no advanced features available
  const hasAdvancedFeatures =
    supportsNegativePrompt ||
    availableVariants.length > 0 ||
    availableResolutions.length > 0 ||
    availableSoundPresets.length > 0;

  if (!hasAdvancedFeatures) {
    return null;
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-[var(--surface2)] hover:bg-[var(--surface3)] flex items-center justify-between transition-colors"
      >
        <span className="text-sm font-medium text-[var(--text)]">Расширенные настройки</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-[var(--surface)]">
          {/* Negative Prompt */}
          {supportsNegativePrompt && (
            <div>
              <label htmlFor="negative-prompt" className="block text-sm font-medium mb-2">
                Негативный промпт (опционально)
              </label>
              <textarea
                id="negative-prompt"
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange(e.target.value)}
                placeholder="Что НЕ должно быть в видео..."
                className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] resize-none min-h-[60px] text-sm"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Описание элементов, которые нужно исключить из генерации
              </p>
            </div>
          )}

          {/* Model Variant */}
          {availableVariants.length > 0 && (
            <div>
              <label htmlFor="model-variant" className="block text-sm font-medium mb-2">
                Вариант модели
              </label>
              <select
                id="model-variant"
                value={modelVariant}
                onChange={(e) => onModelVariantChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] text-sm"
              >
                <option value="">По умолчанию</option>
                {availableVariants.map((variant) => (
                  <option key={variant} value={variant}>
                    {variant}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resolution (Special) */}
          {availableResolutions.length > 0 && (
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium mb-2">
                Разрешение
              </label>
              <select
                id="resolution"
                value={resolution}
                onChange={(e) => onResolutionChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] text-sm"
              >
                <option value="">Стандарт</option>
                {availableResolutions.map((res) => (
                  <option key={res} value={res}>
                    {res === '1080p_multi' ? '1080p Multi-Shot' : res}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sound Presets (WAN) */}
          {availableSoundPresets.length > 0 && (
            <div>
              <label htmlFor="sound-preset" className="block text-sm font-medium mb-2">
                Пресет звука
              </label>
              <select
                id="sound-preset"
                value={soundPreset}
                onChange={(e) => onSoundPresetChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] text-sm"
              >
                <option value="">Без звука</option>
                {availableSoundPresets.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted)] mt-1">Предустановленные звуковые эффекты</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
