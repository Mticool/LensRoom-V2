"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomActionBar({
  stars,
  approxRub,
  canGenerate,
  onGenerate,
  onReset,
}: {
  stars: number;
  approxRub: number;
  canGenerate: boolean;
  onGenerate: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
      <div
        className="px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)]">Стоимость</div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {stars}⭐ <span className="text-[var(--muted)] font-medium">≈ {approxRub}₽</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
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
            Сгенерировать
          </Button>
        </div>
      </div>
    </div>
  );
}
