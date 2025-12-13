"use client";

import * as React from "react";
import { Sparkles, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  credits?: number;
}

export function GenerateButton({
  onClick,
  isLoading = false,
  disabled = false,
  credits = 1,
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full py-4 px-6 rounded-xl font-bold text-base",
        "flex items-center justify-center gap-2.5",
        "transition-all duration-200",
        "disabled:cursor-not-allowed",
        !disabled && !isLoading
          ? "bg-[var(--color-gold)] text-[#0a0a0f] hover:bg-[var(--color-gold-light)] active:scale-[0.98] shadow-lg shadow-[rgba(245,200,66,0.25)]"
          : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.40)] border border-[rgba(255,255,255,0.10)]"
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Генерация...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-5 h-5" />
          <span>Создать</span>
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-[rgba(0,0,0,0.20)] text-sm font-bold flex items-center gap-1">
            {credits}
            <Star className="w-3 h-3 fill-current" />
          </span>
        </>
      )}
    </button>
  );
}