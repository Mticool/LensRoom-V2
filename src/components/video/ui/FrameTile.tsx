"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconClose, IconImageAdd, IconPlus } from "./TileIcons";

interface FrameTileProps {
  kind: "start" | "end";
  title: string;
  subtitle: string;
  value: string | null;
  required: boolean;
  disabled?: boolean;
  onFile: (file: File, kind: "start" | "end") => Promise<void> | void;
  onClear: () => void;
  error?: string;
}

export function FrameTile({
  kind,
  title,
  subtitle,
  value,
  required: _required,
  disabled,
  onFile,
  onClear,
  error,
}: FrameTileProps) {
  const id = `video-frame-tile-${kind}`;
  const isSelected = !!value;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onFile(file, kind);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, kind);
          e.currentTarget.value = "";
        }}
      />

      <label
        htmlFor={id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative block rounded-2xl border border-dashed transition-all cursor-pointer overflow-hidden",
          "min-h-[140px]",
          isDragging
            ? "border-[#CDFF00] bg-[#CDFF00]/10 scale-[1.02]"
            : error && !isSelected
              ? "border-red-500/35 bg-white/5 hover:bg-white/7"
              : isSelected
                ? "border-[#CDFF00]/30 bg-white/6 hover:bg-white/7"
                : "border-white/10 bg-white/5 hover:bg-white/7",
          disabled && "opacity-60 cursor-not-allowed",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        )}
        title={value ? `${title}: загружено` : `${title}: загрузить или перетащить`}
      >
        {/* subtle preview tint when selected */}
        {isSelected ? (
          <div className="absolute inset-0 opacity-[0.18]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value!} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : null}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
        ) : null}

        <div className="relative p-4">
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                "inline-flex items-center justify-center w-10 h-10 rounded-full border",
                isSelected ? "bg-[#CDFF00]/10 border-[#CDFF00]/22" : "bg-white/5 border-white/10"
              )}
            >
              {isSelected ? (
                <IconCheck className="w-4 h-4 text-[#CDFF00]" />
              ) : (
                <IconPlus className="w-4 h-4 text-white/55" />
              )}
            </div>

            {isSelected && !disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/25 hover:bg-black/35 border border-white/10 transition-colors"
                title="Убрать"
              >
                <IconClose className="w-3.5 h-3.5 text-white/70" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/20 border border-white/10">
                <IconImageAdd className="w-3.5 h-3.5 text-white/35" />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold text-white/90 leading-snug line-clamp-2">{title}</div>
            <div className="mt-1.5 text-xs text-white/45 leading-snug line-clamp-2">{subtitle}</div>
          </div>
        </div>
      </label>
    </div>
  );
}
