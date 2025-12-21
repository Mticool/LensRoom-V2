"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomActionBarProps {
  stars: number;
  approxRub: number;
  hint?: string;
  canGenerate: boolean;
  onGenerate: () => void;
  onReset: () => void;
  onOpenLibrary?: () => void;
  newResultsCount?: number;
}

export const BottomActionBar = memo(function BottomActionBar({
  stars,
  approxRub,
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
        {/* Mobile layout: compact two rows */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Price left */}
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Цена</div>
            <div className="text-sm font-bold text-[var(--text)]">{stars}⭐</div>
          </div>
          
          {/* Action buttons right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] active:scale-95 transition-transform"
              title="Сбросить"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {onOpenLibrary && (
              <button
                onClick={onOpenLibrary}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] active:scale-95 transition-transform"
                title="История"
              >
                <FolderOpen className="w-4 h-4" />
                {newResultsCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--gold)] text-black text-[10px] font-bold">
                    {newResultsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile: Full-width generate button */}
        <Button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={cn(
            "sm:hidden rounded-xl bg-white text-black hover:bg-white/90 w-full",
            "disabled:opacity-50 disabled:pointer-events-none",
            "h-12 text-base font-semibold active:scale-[0.98] transition-transform"
          )}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Сгенерировать • {stars}⭐
        </Button>

        {/* Desktop layout */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Price info */}
          <div className="min-w-0">
            <div className="text-xs text-[var(--muted)]" title={hint || undefined}>
              Стоимость
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
            Сгенерировать • {stars}⭐
          </Button>
        </div>
      </div>
    </div>
  );
});
