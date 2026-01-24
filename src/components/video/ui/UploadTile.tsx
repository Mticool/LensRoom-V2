"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconClose, IconImageAdd, IconVideoCam } from "./TileIcons";
import type { UploadTileKind } from "../video-types";

interface UploadTileProps {
  kind: UploadTileKind;
  variant?: "default" | "motion-control";
  title: string;
  subtitle: string;
  value: string | null;
  required: boolean;
  accept: string;
  disabled?: boolean;
  onFile: (file: File, kind: UploadTileKind) => Promise<void> | void;
  onClear: () => void;
}

export function UploadTile({
  kind,
  variant = "default",
  title,
  subtitle,
  value,
  required: _required,
  accept,
  disabled,
  onFile,
  onClear,
}: UploadTileProps) {
  const id = `video-upload-tile-${kind}`;
  const isVideo = kind === "motion" || kind === "editVideo";
  const isSelected = !!value;
  const isMotionControlSquare = variant === "motion-control" && (kind === "motion" || kind === "character");
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
    if (file) {
      // Check if file type matches accept prop
      const acceptTypes = accept.split(",").map(t => t.trim());
      const isValid = acceptTypes.some(type => {
        if (type.includes("*")) {
          return file.type.startsWith(type.replace("*", ""));
        }
        return file.type === type || file.name.toLowerCase().endsWith(type.replace(".", ""));
      });
      if (isValid) {
        onFile(file, kind);
      }
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="file"
        accept={accept}
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
          "group relative block transition-all cursor-pointer overflow-hidden",
          isMotionControlSquare ? "rounded-2xl border aspect-square" : "rounded-3xl border border-dashed min-h-[170px]",
          isDragging
            ? "border-[#CDFF00] bg-[#CDFF00]/10 scale-[1.02]"
            : isSelected 
              ? "border-[#CDFF00]/35 bg-white/6 hover:bg-white/7" 
              : "border-white/10 bg-white/5 hover:bg-white/7",
          disabled && "opacity-60 cursor-not-allowed",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        )}
      >
        {/* subtle preview tint when selected */}
        {isSelected ? (
          <div className="absolute inset-0 opacity-[0.14]">
            {isVideo ? (
              <video src={value!} muted playsInline className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value!} alt={title} className="w-full h-full object-cover" />
            )}
          </div>
        ) : null}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
        ) : null}

        <div className={cn("relative", isMotionControlSquare ? "p-4" : "p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "inline-flex items-center justify-center w-11 h-11 rounded-full border",
                isSelected ? "bg-[#CDFF00]/10 border-[#CDFF00]/22" : "bg-white/5 border-white/10"
              )}
            >
              {isSelected ? (
                <IconCheck className="w-[18px] h-[18px] text-[#CDFF00]" />
              ) : isVideo ? (
                <IconVideoCam className="w-[18px] h-[18px] text-white/55" />
              ) : (
                <IconImageAdd className="w-[18px] h-[18px] text-white/55" />
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
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/25 hover:bg-black/35 border border-white/10 transition-colors"
                title="Убрать"
              >
                <IconClose className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/20 border border-white/10">
                {isVideo ? (
                  <IconVideoCam className="w-[16px] h-[16px] text-white/35" />
                ) : (
                  <IconImageAdd className="w-[16px] h-[16px] text-white/35" />
                )}
              </div>
            )}
          </div>

          <div className={cn(isMotionControlSquare ? "mt-5" : "mt-6")}>
            <div className={cn(isMotionControlSquare ? "text-[13px]" : "text-[15px]", "font-semibold text-white/90 leading-snug line-clamp-2")}>
              {title}
            </div>
            <div className={cn(isMotionControlSquare ? "mt-1 text-[12px]" : "mt-2 text-sm", "text-white/45 leading-snug line-clamp-2")}>
              {subtitle}
            </div>
          </div>
        </div>
      </label>
    </div>
  );
}
