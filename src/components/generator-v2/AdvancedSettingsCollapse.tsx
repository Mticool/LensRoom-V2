'use client';

import { Sliders, Hash, Shuffle } from 'lucide-react';

interface AdvancedSettingsCollapseProps {
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  seed?: number | null;
  onSeedChange?: (value: number | null) => void;
  steps?: number;
  onStepsChange?: (value: number) => void;
  disabled?: boolean;
}

export function AdvancedSettingsCollapse({
  negativePrompt,
  onNegativePromptChange,
  seed,
  onSeedChange,
  steps,
  onStepsChange,
  disabled
}: AdvancedSettingsCollapseProps) {
  const handleRandomSeed = () => {
    if (onSeedChange && !disabled) {
      const randomSeed = Math.floor(Math.random() * 1000000);
      onSeedChange(randomSeed);
    }
  };

  return (
    <div className="space-y-3">
      {/* Negative Prompt */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" />
          Negative Prompt (необязательно)
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          disabled={disabled}
          placeholder="Что не должно быть на изображении..."
          className={`
            w-full px-3 py-2 rounded-lg border resize-none
            text-sm text-white placeholder:text-[#6B6B6E]
            focus:outline-none focus:ring-2 focus:ring-[#CDFF00]/20
            transition-colors
            ${disabled 
              ? 'bg-[#1C1C1E] border-[#2C2C2E] cursor-not-allowed opacity-50' 
              : 'bg-[#1E1E20] border-[#3A3A3C] hover:border-[#4A4A4C] focus:border-[#CDFF00]'
            }
          `}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Seed */}
        {onSeedChange !== undefined && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Seed (для воспроизводимости)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onSeedChange(val ? parseInt(val) : null);
                }}
                disabled={disabled}
                placeholder="Случайный"
                className={`
                  flex-1 px-3 py-2 rounded-lg border
                  text-sm text-white placeholder:text-[#6B6B6E]
                  focus:outline-none focus:ring-2 focus:ring-[#CDFF00]/20
                  transition-colors
                  ${disabled 
                    ? 'bg-[#1C1C1E] border-[#2C2C2E] cursor-not-allowed opacity-50' 
                    : 'bg-[#1E1E20] border-[#3A3A3C] hover:border-[#4A4A4C] focus:border-[#CDFF00]'
                  }
                `}
              />
              <button
                onClick={handleRandomSeed}
                disabled={disabled}
                className={`
                  px-3 py-2 rounded-lg border transition-colors
                  ${disabled
                    ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
                    : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
                  }
                `}
                title="Случайный seed"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Steps */}
        {onStepsChange !== undefined && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#A1A1AA] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Шаги (steps)
            </label>
            <input
              type="number"
              value={steps || 25}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= 100) {
                  onStepsChange(val);
                }
              }}
              disabled={disabled}
              min={1}
              max={100}
              className={`
                w-full px-3 py-2 rounded-lg border
                text-sm text-white placeholder:text-[#6B6B6E]
                focus:outline-none focus:ring-2 focus:ring-[#CDFF00]/20
                transition-colors
                ${disabled 
                  ? 'bg-[#1C1C1E] border-[#2C2C2E] cursor-not-allowed opacity-50' 
                  : 'bg-[#1E1E20] border-[#3A3A3C] hover:border-[#4A4A4C] focus:border-[#CDFF00]'
                }
              `}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-[#6B6B6E]">
        💡 Используйте negative prompt для исключения нежелательных элементов, seed для повторяемых результатов
      </p>
    </div>
  );
}
