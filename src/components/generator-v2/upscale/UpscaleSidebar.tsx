'use client';

import { ArrowUpFromLine, RotateCcw, Sparkles, Loader2, Star } from 'lucide-react';

interface UpscaleSidebarProps {
  scale: '2k' | '4k' | '8k';
  onScaleChange: (scale: '2k' | '4k' | '8k') => void;
  onUpscale: () => void;
  onReset: () => void;
  isProcessing: boolean;
  disabled?: boolean;
  credits: number;
  estimatedCost: number;
}

const SCALE_OPTIONS = [
  { value: '2k' as const, label: '2K', price: 17 },
  { value: '4k' as const, label: '4K', price: 34 },
  { value: '8k' as const, label: '8K', price: 68 },
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
          <ArrowUpFromLine className="w-5 h-5 text-[#f59e0b]" />
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
                    ? 'bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]'
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
            {scale === '8k' ? 'Апскейл до 8K' : scale === '4k' ? 'Апскейл до 4K' : 'Апскейл до 2K'}
          </p>
        </div>

        {/* Price Info */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[#A1A1AA] uppercase tracking-wider">
            Стоимость
          </label>
          <div className="flex items-center justify-between p-4 bg-[#1E1E20] border border-[#3A3A3C] rounded-xl">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-xl font-bold text-white">{estimatedCost}</span>
            </div>
            <div className="text-sm text-[#6B6B6E]">
              Баланс: <span className={hasEnoughCredits ? 'text-[#f59e0b]' : 'text-red-400'}>{credits}⭐</span>
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
              ? 'bg-[#f59e0b] text-black hover:bg-[#fbbf24] shadow-lg shadow-[#f59e0b]/20'
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
