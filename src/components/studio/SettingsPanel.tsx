"use client";

import { memo, useId } from "react";
import type { Aspect, Duration, Mode, Quality, StudioModel } from "@/config/studioModels";
import { cn } from "@/lib/utils";
import { Upload, Volume2 } from "lucide-react";

function fileUrl(file: File | null | undefined): string | null {
  if (!file) return null;
  return URL.createObjectURL(file);
}

const MODE_LABELS: Record<Mode, string> = {
  t2i: "Текст → Фото",
  i2i: "Фото → Фото",
  t2v: "Текст → Видео",
  i2v: "Фото → Видео",
  start_end: "Старт → Финиш",
  storyboard: "Раскадровка",
};

const QUALITY_LABELS: Record<string, string> = {
  standard: "Standard",
  high: "High",
  ultra: "Ultra",
  fast: "Fast",
  quality: "Quality",
  turbo: "Turbo",
  balanced: "Balanced",
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
  "8k": "8K",
  "480p": "480p",
  "720p": "720p",
  "1080p": "1080p",
};

interface SettingsPanelProps {
  model: StudioModel;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  quality: Quality;
  onQualityChange: (q: Quality) => void;
  aspect: Aspect;
  onAspectChange: (a: Aspect) => void;
  duration?: Duration;
  onDurationChange?: (d: Duration) => void;
  audio?: boolean;
  onAudioChange?: (v: boolean) => void;
  referenceImage: File | null;
  onReferenceImageChange: (f: File | null) => void;
}

export const SettingsPanel = memo(function SettingsPanel({
  model,
  mode,
  onModeChange,
  quality,
  onQualityChange,
  aspect,
  onAspectChange,
  duration,
  onDurationChange,
  audio,
  onAudioChange,
  referenceImage,
  onReferenceImageChange,
}: SettingsPanelProps) {
  const refId = useId();

  const showDuration = model.kind === "video" && !!model.durationOptions?.length && mode !== "storyboard";
  const showAudio = model.kind === "video" && !!model.supportsAudio && mode !== "storyboard";
  const showReference = !!model.supportsImageInput && (mode === "i2i" || mode === "i2v");

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Настройки</div>
        <div className="text-xs text-[var(--muted)] mt-1">Опции меняются в зависимости от модели и режима</div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Режим</div>
          <div className="flex flex-wrap gap-2">
            {model.modes.map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm transition-colors",
                  "motion-reduce:transition-none",
                  m === mode
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-[var(--text)] border-white/10 hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Качество</div>
          <div className="flex gap-2 flex-wrap">
            {model.qualityTiers.map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm transition-colors",
                  "motion-reduce:transition-none",
                  q === quality
                    ? "bg-[var(--surface2)] border-white/20 text-[var(--text)]"
                    : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {QUALITY_LABELS[String(q)] || String(q)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Соотношение</div>
          <div className="flex gap-2 flex-wrap">
            {model.aspectRatios.map((a) => (
              <button
                key={a}
                onClick={() => onAspectChange(a)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm transition-colors",
                  "motion-reduce:transition-none",
                  a === aspect
                    ? "bg-[var(--surface2)] border-white/20 text-[var(--text)]"
                    : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {showDuration && model.durationOptions && onDurationChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Длительность</div>
            <div className="flex gap-2">
              {model.durationOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => onDurationChange(d)}
                  className={cn(
                    "h-9 px-3 rounded-2xl border text-sm transition-colors",
                    "motion-reduce:transition-none",
                    d === duration
                      ? "bg-[var(--surface2)] border-white/20 text-[var(--text)]"
                      : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}

        {showAudio && onAudioChange && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--surface2)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[var(--muted)]" />
              <div>
                <div className="text-sm font-medium">Звук</div>
                <div className="text-xs text-[var(--muted)]">Добавить аудио (если доступно)</div>
              </div>
            </div>
            <button
              onClick={() => onAudioChange(!audio)}
              className={cn(
                "h-8 w-14 rounded-full border transition-colors relative",
                "motion-reduce:transition-none",
                audio ? "bg-white border-white" : "bg-transparent border-white/15"
              )}
              aria-label="Audio toggle"
            >
              <span
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full transition-transform",
                  "motion-reduce:transition-none",
                  audio ? "bg-black translate-x-7" : "bg-white/70 translate-x-1"
                )}
              />
            </button>
          </div>
        )}

        {showReference && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Референс</div>
            <label
              htmlFor={refId}
              className={cn(
                "block rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden cursor-pointer",
                "transition-colors hover:border-white/20 motion-reduce:transition-none"
              )}
            >
              <input
                id={refId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onReferenceImageChange(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                  {referenceImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(referenceImage) || ""} alt="ref" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-white/70" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{referenceImage ? referenceImage.name : "Загрузить изображение"}</div>
                  <div className="text-xs text-[var(--muted)]">Используется для i2i / i2v</div>
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
});
