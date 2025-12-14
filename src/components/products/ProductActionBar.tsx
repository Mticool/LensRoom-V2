"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Sparkles,
  Loader2,
  AlertCircle,
  Plus,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductActionBarProps {
  totalCost: number;
  starsBalance: number;
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onBuyStars: () => void;
  slidesCount: number;
  generationType: "single" | "pack";
}

export function ProductActionBar({
  totalCost,
  starsBalance,
  isGenerating,
  canGenerate,
  onGenerate,
  onBuyStars,
  slidesCount,
  generationType,
}: ProductActionBarProps) {
  const hasEnoughStars = starsBalance >= totalCost;
  const insufficientStars = totalCost - starsBalance;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-lg border-t border-[var(--border)]">
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between py-4 gap-4">
          {/* Left: Cost breakdown */}
          <div className="flex items-center gap-6">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface2)]">
              <Wallet className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)]">Баланс:</span>
              <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
              <span className={cn(
                "font-semibold",
                hasEnoughStars ? "text-[var(--text)]" : "text-red-400"
              )}>
                {starsBalance}
              </span>
            </div>

            {/* Cost */}
            <div>
              <div className="text-xs text-[var(--muted)] mb-0.5">
                {generationType === "single" ? "Стоимость" : `Набор (${slidesCount} слайдов)`}
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[var(--gold)] fill-[var(--gold)]" />
                <span className="text-xl font-bold text-[var(--text)]">{totalCost}</span>
                {!hasEnoughStars && (
                  <Badge variant="error" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Не хватает {insufficientStars}⭐
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {!hasEnoughStars ? (
              <Button
                onClick={onBuyStars}
                size="lg"
                className="px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Докупить
                <Star className="w-4 h-4 ml-1.5 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating}
                size="lg"
                className="px-8 min-w-[200px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Сгенерировать •
                    <Star className="w-4 h-4 ml-1.5 mr-0.5 fill-current" />
                    {totalCost}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

