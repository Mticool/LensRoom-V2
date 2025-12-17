"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
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
    <div className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div
        className="px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)]" title={hint || undefined}>
            Стоимость
          </div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {stars}⭐ <span className="text-[var(--muted)] font-medium">≈ {approxRub}₽</span>
          </div>
        </div>

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

          <Button
            onClick={onGenerate}
            disabled={!canGenerate}
            className={cn(
              "rounded-xl bg-white text-black hover:bg-white/90",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Сгенерировать • {stars} ⭐
          </Button>
        </div>
      </div>
    </div>
  );
});
