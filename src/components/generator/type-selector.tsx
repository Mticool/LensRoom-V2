"use client";

import * as React from "react";
import { Camera, Video, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/generator";

interface TypeSelectorProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
}

const types = [
  { id: "photo" as const, label: "Фото", icon: Camera },
  { id: "video" as const, label: "Видео", icon: Video },
  { id: "product" as const, label: "Продукт", icon: Package },
];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {types.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onChange(type.id)}
            className={cn(
              "flex flex-col items-center gap-2 py-3.5 rounded-xl border transition-all",
              isSelected
                ? "bg-[rgba(245,200,66,0.15)] border-[var(--color-gold)] text-[var(--color-gold)]"
                : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.70)] hover:border-[rgba(255,255,255,0.22)] hover:text-white"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-sm font-semibold">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
