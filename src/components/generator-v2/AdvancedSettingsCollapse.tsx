'use client';

import { Hash, Shuffle } from 'lucide-react';

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
    <div className="space-y-2.5">
      {/* Negative Prompt */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
          Negative Prompt
        </label>
        <textarea
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          disabled={disabled}
          placeholder="Что исключить..."
          className={`
            w-full px-2.5 py-1.5 rounded-lg resize-none
            text-[11px] text-white/80 placeholder:text-white/25
            bg-white/5 border-none outline-none
            focus:outline-none focus:ring-0 focus:bg-white/8
            transition-colors
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Seed */}
        {onSeedChange !== undefined && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Seed
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onSeedChange(val ? parseInt(val) : null);
                }}
                disabled={disabled}
                placeholder="Random"
                className={`
                  flex-1 px-2.5 py-1.5 rounded-lg
                  text-[11px] text-white/80 placeholder:text-white/25
                  bg-white/5 border-none outline-none
                  focus:outline-none focus:ring-0 focus:bg-white/8
                  transition-colors
                  ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              />
              <button
                onClick={handleRandomSeed}
                disabled={disabled}
                className={`
                  px-2 py-1.5 rounded-lg transition-colors
                  ${disabled
                    ? 'bg-white/3 text-white/20 cursor-not-allowed'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }
                `}
                title="Random seed"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Steps */}
        {onStepsChange !== undefined && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
              Steps
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
                w-full px-2.5 py-1.5 rounded-lg
                text-[11px] text-white/80 placeholder:text-white/25
                bg-white/5 border-none outline-none
                focus:outline-none focus:ring-0 focus:bg-white/8
                transition-colors
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            />
          </div>
        )}
      </div>

      <p className="text-[10px] text-white/25 leading-relaxed">
        Negative prompt исключает нежелательные элементы, seed даёт повторяемый результат
      </p>
    </div>
  );
}
