"use client";

import { memo } from "react";
import type { Aspect, Mode, StudioModel } from "@/config/studioModels";
import { cn } from "@/lib/utils";
import { Film, Image as ImageIcon } from "lucide-react";

function aspectToCss(aspect: Aspect): string {
  const v = String(aspect || "").trim();
  if (v === "portrait") return "9 / 16";
  if (v === "landscape") return "16 / 9";
  const m = v.match(/^(\d+)\s*:\s*(\d+)$/);
  if (m) return `${m[1]} / ${m[2]}`;
  return "16 / 9";
}

interface GeneratorPreviewProps {
  model: StudioModel;
  mode: Mode;
  aspect: Aspect;
  referencePreviewUrl?: string | null;
  resultUrl?: string | null;
}

export const GeneratorPreview = memo(function GeneratorPreview({
  model,
  mode,
  aspect,
  referencePreviewUrl,
  resultUrl,
}: GeneratorPreviewProps) {
  const isVideo = model.kind === "video";
  const Icon = isVideo ? Film : ImageIcon;

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--muted)]" />
          <div className="text-sm font-semibold">Preview</div>
        </div>
        <div className="text-xs text-[var(--muted)]">
          {model.kind.toUpperCase()} • {mode} • {aspect}
        </div>
      </div>

      <div className="p-5">
        <div
          className={cn(
            "w-full rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden",
            "flex items-center justify-center"
          )}
          style={{ aspectRatio: aspectToCss(aspect) }}
        >
          {resultUrl ? (
            isVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={resultUrl} controls className="w-full h-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="Result preview" className="w-full h-full object-cover" />
            )
          ) : referencePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={referencePreviewUrl}
              alt="Reference preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center px-6 py-10">
              <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center mx-auto">
                <Icon className="w-6 h-6 text-white/70" />
              </div>
              <div className="mt-4 text-sm text-white/80">Результат появится здесь после генерации</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Запустите генерацию — превью обновится автоматически</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
