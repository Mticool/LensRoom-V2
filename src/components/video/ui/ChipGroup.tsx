"use client";

import { cn } from "@/lib/utils";

interface ChipGroupProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ChipGroup({
  label,
  value,
  options,
  onChange,
  disabled,
}: ChipGroupProps) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-1 bg-white/5 border border-white/10 rounded-xl">
      <span className="hidden sm:inline text-[10px] text-white/40 px-1.5">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200",
            opt.value === value
              ? "bg-[#CDFF00] text-black shadow-sm shadow-[#CDFF00]/20 ring-1 ring-[#CDFF00]/30"
              : "bg-transparent text-white/60 hover:bg-white/10 hover:text-white",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
