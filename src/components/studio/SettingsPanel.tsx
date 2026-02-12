"use client";

import { memo, useId } from "react";
import type { Aspect, Duration, Mode, Quality, StudioModel } from "@/config/studioModels";
import { getModelById, type VideoModelConfig } from "@/config/models";
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
  v2v: "Видео → Видео (R2V)",
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
  // Ideogram Character packs
  a_12cred: "A • 12c",
  a_18cred: "A • 18c",
  a_24cred: "A • 24c",
  b_36cred: "B • 36c",
  b_45cred: "B • 45c",
  b_54cred: "B • 54c",
  c_48cred: "C • 48c",
  c_60cred: "C • 60c",
  c_72cred: "C • 72c",
  "480p": "480p",
  "720p": "720p",
  "1080p": "1080p",
  "1080p_multi": "Multi-shot 1080p",
};

// Sound preset labels for WAN
const SOUND_PRESET_LABELS: Record<string, string> = {
  // WAN 2.5 presets
  'native': 'Нативный звук',
  'lip-sync': 'Lip-sync',
  'ambient': 'Ambient',
  'music': 'Музыка',
  // WAN 2.6 presets
  'native-dialogues': 'Нативные диалоги',
  'precise-lip-sync': 'Точный lip-sync',
  'ambient-atmospheric': 'Атмосферные звуки',
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
  modelVariant?: string;
  onModelVariantChange?: (v: string) => void;
  resolution?: string; // For models with resolution selection (e.g., WAN)
  onResolutionChange?: (r: string) => void;
  referenceImage: File | null;
  onReferenceImageChange: (f: File | null) => void;
  // Kling Motion Control: reference video (file)
  motionReferenceVideo?: File | null;
  onMotionReferenceVideoChange?: (f: File | null) => void;
  motionReferenceVideoDurationSec?: number | null;
  // WAN-specific: Sound presets
  soundPreset?: string;
  onSoundPresetChange?: (s: string) => void;
  // V2V mode: Reference video URL
  referenceVideoUrl?: string;
  onReferenceVideoUrlChange?: (url: string) => void;
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
  modelVariant,
  onModelVariantChange,
  resolution,
  onResolutionChange,
  referenceImage,
  onReferenceImageChange,
  motionReferenceVideo,
  onMotionReferenceVideoChange,
  motionReferenceVideoDurationSec,
  soundPreset,
  onSoundPresetChange,
  referenceVideoUrl,
  onReferenceVideoUrlChange,
}: SettingsPanelProps) {
  const refId = useId();
  const motionVideoId = useId();

  // Check if model has variants (like Kling/WAN)
  const modelConfig = getModelById(model.key);
  const hasModelVariants = modelConfig?.type === "video" && (modelConfig as VideoModelConfig).modelVariants?.length;
  const modelVariants = hasModelVariants ? (modelConfig as VideoModelConfig).modelVariants! : [];
  
  // Get current variant config for WAN dynamic filtering
  const isWan = model.key === 'wan';
  const currentVariant = modelVariants.find(v => v.id === modelVariant);
  const isMotionControl = model.key === "kling-motion-control";
  
  // Dynamic options based on WAN variant
  const effectiveModes = isWan && currentVariant?.modes 
    ? (currentVariant.modes as Mode[]) 
    : model.modes;
  const effectiveDurations = isWan && currentVariant?.durationOptions 
    ? currentVariant.durationOptions 
    : model.durationOptions;
  const effectiveResolutions = isWan && currentVariant?.resolutionOptions 
    ? currentVariant.resolutionOptions 
    : (modelConfig as VideoModelConfig)?.resolutionOptions || [];
  const effectiveAspectRatios = isWan && currentVariant?.aspectRatios 
    ? currentVariant.aspectRatios 
    : model.aspectRatios;
  const soundOptions = isWan && currentVariant?.soundOptions 
    ? currentVariant.soundOptions 
    : [];

  const showDuration = model.kind === "video" && !!effectiveDurations?.length && mode !== "storyboard";
  const showAudio = model.kind === "video" && !!model.supportsAudio && mode !== "storyboard" && !isWan; // Hide audio toggle for WAN (use sound presets instead)
  const showReference = !!model.supportsImageInput && (mode === "i2i" || mode === "i2v" || isMotionControl);
  const showV2vReference = mode === "v2v" && isWan;
  const showMotionControlVideo = isMotionControl;

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Настройки</div>
        <div className="text-xs text-[var(--muted)] mt-1">Опции меняются в зависимости от модели и режима</div>
      </div>

      <div className="p-5 space-y-5">
        {hasModelVariants && onModelVariantChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Модель</div>
            <select
              value={modelVariant || modelVariants[0]?.id || ""}
              onChange={(e) => onModelVariantChange(e.target.value)}
              className={cn(
                "w-full h-10 rounded-2xl border bg-[var(--surface2)] px-3 text-sm text-[var(--text)]",
                "border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
              )}
            >
              {modelVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Режим</div>
          <div className="flex flex-wrap gap-2">
            {effectiveModes.map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  m === mode
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
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
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  q === quality
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
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
            {effectiveAspectRatios.map((a) => (
              <button
                key={a}
                onClick={() => onAspectChange(a)}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  a === aspect
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                    : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution selector (WAN only; others use quality tiers) */}
        {isWan && effectiveResolutions.length > 0 && onResolutionChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Разрешение</div>
            <div className="flex gap-2 flex-wrap">
              {effectiveResolutions.map((r) => (
                <button
                  key={r}
                  onClick={() => onResolutionChange(r)}
                  className={cn(
                    "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                    "motion-reduce:transition-none",
                    r === resolution
                      ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                      : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                  )}
                >
                  {QUALITY_LABELS[r] || r}
                </button>
              ))}
            </div>
          </div>
        )}

        {showDuration && effectiveDurations && onDurationChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Длительность</div>
            <div className="flex gap-2">
              {effectiveDurations.map((d) => (
                <button
                  key={d}
                  onClick={() => onDurationChange(d)}
                  className={cn(
                    "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                    "motion-reduce:transition-none",
                    d === duration
                      ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                      : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sound presets for WAN */}
        {isWan && soundOptions.length > 0 && onSoundPresetChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Звук</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onSoundPresetChange('')}
                className={cn(
                  "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                  "motion-reduce:transition-none",
                  !soundPreset
                    ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                    : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                )}
              >
                Без звука
              </button>
              {soundOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => onSoundPresetChange(s)}
                  className={cn(
                    "h-9 px-3 rounded-2xl border text-sm font-medium transition-all",
                    "motion-reduce:transition-none",
                    s === soundPreset
                      ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
                      : "bg-transparent border-white/10 text-[var(--text)] hover:border-white/20 hover:bg-[var(--surface2)]"
                  )}
                >
                  {SOUND_PRESET_LABELS[s] || s}
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

        {/* Motion Control reference video (required) */}
        {showMotionControlVideo && onMotionReferenceVideoChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Референс движения (видео)</div>
            <label
              htmlFor={motionVideoId}
              className={cn(
                "block rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden cursor-pointer",
                "transition-colors hover:border-white/20 motion-reduce:transition-none"
              )}
            >
              <input
                id={motionVideoId}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => onMotionReferenceVideoChange(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3 p-4">
                <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                  <Upload className="w-5 h-5 text-white/70" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {motionReferenceVideo ? motionReferenceVideo.name : "Загрузить видео (3–30 сек)"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {motionReferenceVideoDurationSec
                      ? `Длительность: ~${Math.round(motionReferenceVideoDurationSec)}с`
                      : "Нужно для Kling Motion Control"}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    Форматы: MP4/MOV/WEBM, до 100MB
                  </div>
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Reference video URL for V2V mode (WAN 2.6) */}
        {showV2vReference && onReferenceVideoUrlChange && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Референс видео (URL)</div>
            <input
              type="url"
              value={referenceVideoUrl || ''}
              onChange={(e) => onReferenceVideoUrlChange(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className={cn(
                "w-full h-10 rounded-2xl border bg-[var(--surface2)] px-3 text-sm text-[var(--text)]",
                "border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20",
                "placeholder:text-[var(--muted)]"
              )}
            />
            <div className="text-xs text-[var(--muted)] mt-1">
              URL видео для Reference / Video-to-Video генерации (только WAN 2.6)
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
