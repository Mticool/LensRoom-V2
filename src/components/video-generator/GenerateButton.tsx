'use client';

import { Loader2, Sparkles } from 'lucide-react';

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  cost: number;
  className?: string;
}

export function GenerateButton({
  onClick,
  isGenerating,
  disabled = false,
  cost,
  className = '',
}: GenerateButtonProps) {
  const isDisabled = disabled || isGenerating;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-black text-sm font-semibold rounded-lg px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent-primary)] ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Генерация...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span>Сгенерировать</span>
          <span className="ml-auto font-bold">{cost}⭐</span>
        </>
      )}
    </button>
  );
}
