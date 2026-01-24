"use client";

import { useEffect, useRef } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptTextareaProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function PromptTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  onSubmit,
  autoFocus,
}: PromptTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;
    if (disabled) return;
    const t = window.setTimeout(() => {
      try {
        ref.current?.focus();
        const el = ref.current;
        if (el) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } catch {}
    }, 50);
    return () => window.clearTimeout(t);
  }, [autoFocus, disabled]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder || "Опишите то, что хотите получить..."}
        disabled={disabled}
        rows={3}
        className={cn(
          "w-full px-4 py-3 pr-10 pb-8 rounded-xl resize-none overflow-hidden",
          "bg-white/5 text-white placeholder:text-white/40",
          "border border-white/10 focus:border-[#CDFF00] focus:outline-none",
          "transition-all duration-200",
          "min-h-[80px] max-h-[200px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Промпт для генерации видео"
      />
      <Film className="absolute right-3 top-3 w-5 h-5 text-white/25 pointer-events-none" />
      {onSubmit ? (
        <div className="absolute bottom-2.5 right-3 text-[10px] text-white/35 pointer-events-none hidden sm:block">
          Ctrl+Enter
        </div>
      ) : null}
    </div>
  );
}
