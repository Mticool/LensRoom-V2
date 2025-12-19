'use client';

import { Sparkles, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomActionBarProps {
  // Pricing
  stars: number;
  approxRub: number;
  priceLabel?: string;
  
  // Button
  buttonText: string;
  buttonIcon?: 'photo' | 'video';
  onGenerate: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  progress?: number;
  
  // Optional
  warningText?: string;
  className?: string;
}

export function BottomActionBar({
  stars,
  approxRub,
  priceLabel = 'Стоимость',
  buttonText,
  buttonIcon = 'photo',
  onGenerate,
  disabled = false,
  isGenerating = false,
  progress = 0,
  warningText,
  className,
}: BottomActionBarProps) {
  const Icon = buttonIcon === 'video' ? Video : Sparkles;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'border-t border-[var(--border)]',
        'bg-[var(--surface)]/95 backdrop-blur-lg',
        'transition-all duration-200',
        className
      )}
    >
      <div
        className="container mx-auto px-6 py-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Price Display */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-[var(--muted)]">{priceLabel}:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--text)]">{stars}⭐</span>
                <span className="text-sm text-[var(--muted)]">≈ {approxRub}₽</span>
              </div>
            </div>
            {warningText && (
              <p className="text-xs text-amber-400/80 mt-1">{warningText}</p>
            )}
          </div>

          {/* Right: Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            variant="default"
            size="lg"
            className="min-w-[200px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Генерация {progress}%
              </>
            ) : (
              <>
                <Icon className="w-5 h-5 mr-2" />
                {buttonText}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


