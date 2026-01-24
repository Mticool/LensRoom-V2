'use client';

import { ArrowUpFromLine, RotateCcw, Sparkles, Loader2, Star } from 'lucide-react';

interface UpscaleSidebarProps {
  scale: '2x' | '4x';
  onScaleChange: (scale: '2x' | '4x') => void;
  onUpscale: () => void;
  onReset: () => void;
  isProcessing: boolean;
  disabled?: boolean;
  credits: number;
  estimatedCost: number;
}

const SCALE_OPTIONS = [
  { value: '2x' as const, label: '2x', price: 17 },
  { value: '4x' as const, label: '4x', price: 34 },
];

export function UpscaleSidebar({
  scale,
  onScaleChange,
  onUpscale,
  onReset,
  isProcessing,
  disabled,
  credits,
  estimatedCost,
}: UpscaleSidebarProps) {
  const hasEnoughCredits = credits >= estimatedCost;
  const canUpscale = !disabled && !isProcessing && hasEnoughCredits;

  return (
    <div className="w-full md:w-80 bg-[#18181B] border-l border-[#27272A] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="w-5 h-5 text-[#CDFF00]" />
          <span className="font-semibold text-white">Upscale</span>
        </div>
        <button
          onClick={onReset}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Сброс</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Scale Factor */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
            Масштаб
          </label>
          <div className="flex gap-2">
            {SCALE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onScaleChange(option.value)}
                disabled={isProcessing}
                className={`
                  flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-all
                  ${scale === option.value
                    ? 'bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]'
                    : 'bg-[#1E1E20] border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B6B6E]">
            {scale === '2x' ? 'Увеличение в 2 раза' : 'Увеличение в 4 раза'}
          </p>
        </div>

        {/* Price Info */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
            Стоимость
          </label>
          <div className="flex items-center justify-between p-4 bg-[#1E1E20] border border-[#3A3A3C] rounded-xl">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#CDFF00]" />
              <span className="text-xl font-bold text-white">{estimatedCost}</span>
            </div>
            <div className="text-sm text-[#6B6B6E]">
              Баланс: <span className={hasEnoughCredits ? 'text-[#CDFF00]' : 'text-red-400'}>{credits}⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Upscale Button */}
      <div className="p-4 border-t border-[#27272A]">
        <button
          onClick={onUpscale}
          disabled={!canUpscale}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-base transition-all
            ${canUpscale
              ? 'bg-[#CDFF00] text-black hover:bg-[#B8E600] shadow-lg shadow-[#CDFF00]/20'
              : 'bg-[#27272A] text-[#6B6B6E] cursor-not-allowed'
            }
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Обработка...</span>
            </>
          ) : (
            <>
              <span>Апскейл</span>
              <Sparkles className="w-5 h-5" />
            </>
          )}
        </button>
        
        {!hasEnoughCredits && !isProcessing && (
          <p className="text-center text-sm text-red-400 mt-2">
            Недостаточно звёзд
          </p>
        )}
      </div>
    </div>
  );
}
