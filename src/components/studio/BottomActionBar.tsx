"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { MobileButton } from "@/components/ui/mobile-button";
import { RotateCcw, Sparkles, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// Haptic feedback utility
const haptic = (style: 'light' | 'medium' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(style === 'light' ? 10 : 15);
  }
};

interface BottomActionBarProps {
  stars: number;
  hint?: string;
  canGenerate: boolean;
  onGenerate: () => void;
  onReset: () => void;
  onOpenLibrary?: () => void;
  newResultsCount?: number;
}

export const BottomActionBar = memo(function BottomActionBar({
  stars,
  hint,
  canGenerate,
  onGenerate,
  onReset,
  onOpenLibrary,
  newResultsCount = 0,
}: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-xl">
      <div
        className="px-3 sm:px-6 py-3 flex flex-col gap-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {/* Mobile layout: improved with larger touch targets */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Price left */}
          <div className="min-w-0 flex-shrink-0">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Списать</div>
            <div className="text-sm font-bold text-[var(--text)]">{stars}⭐</div>
          </div>

          {/* Action buttons right - using MobileButton for better UX */}
          <div className="ml-auto flex items-center gap-2">
            <MobileButton
              variant="icon"
              size="icon"
              onClick={() => {
                haptic('light');
                onReset();
              }}
              title="Сбросить"
              haptic="none"
            >
              <RotateCcw className="w-5 h-5" />
            </MobileButton>
            {onOpenLibrary && (
              <MobileButton
                variant="icon"
                size="icon"
                onClick={() => {
                  haptic('light');
                  onOpenLibrary();
                }}
                title="История"
                className="relative"
                haptic="none"
              >
                <FolderOpen className="w-5 h-5" />
                {newResultsCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-white text-black text-[10px] font-bold shadow-lg border border-gray-200">
                    {newResultsCount}
                  </span>
                )}
              </MobileButton>
            )}
          </div>
        </div>

        {/* Mobile: Full-width generate button with improved styling */}
        <MobileButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => {
            haptic('medium');
            onGenerate();
          }}
          disabled={!canGenerate}
          className="sm:hidden"
          haptic="none"
        >
          <Sparkles className="w-5 h-5" />
          Списать {stars}⭐
        </MobileButton>

        {/* Desktop layout */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Price info */}
          <div className="min-w-0">
            <div className="text-xs text-[var(--muted)]" title={hint || undefined}>
              Списать
            </div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {stars}⭐
            </div>
          </div>

          {/* Secondary buttons */}
          <div className="ml-auto flex items-center gap-2">
            {onOpenLibrary && (
              <Button
                variant="outline"
                onClick={onOpenLibrary}
                className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border)] rounded-xl"
              >
                История
                {newResultsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--gold)] text-black text-[11px] font-bold">
                    {newResultsCount}
                  </span>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onReset}
              className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border)] rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Сбросить
            </Button>
          </div>

          {/* Generate button */}
          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className={cn(
              "rounded-xl bg-white text-black hover:bg-white/90 ml-2",
              "disabled:opacity-50 disabled:pointer-events-none",
              "h-12 text-base font-semibold px-6"
            )}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Списать {stars}⭐
          </Button>
        </div>
      </div>
    </div>
  );
});
