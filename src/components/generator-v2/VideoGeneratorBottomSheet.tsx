'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Settings, Loader2, X, Send, ImagePlus, Sparkles, ChevronUp, Film, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getModelById } from "@/config/models";
import { STUDIO_VIDEO_MODELS } from "@/config/studioModels";
import { getModelCapability } from "@/lib/videoModels/capabilities";
import type { ModelCapability } from "@/lib/videoModels/schema";

interface VideoGeneratorBottomSheetProps {
  modelId: string;
  modelName: string;
  estimatedCost: number;

  prompt: string;
  onPromptChange: (v: string) => void;

  mode: string;
  onModeChange: (v: string) => void;
  availableModes: string[];

  duration: number;
  onDurationChange: (v: number) => void;
  durationOptions: number[];

  quality: string;
  onQualityChange: (v: string) => void;
  qualityOptions: string[];

  aspectRatio: string;
  onAspectRatioChange: (v: string) => void;
  aspectRatioOptions: string[];

  referenceImage: File | null;
  onReferenceImageChange: (v: File | null) => void;
  motionReferenceVideo?: File | null;
  onMotionReferenceVideoChange?: (v: File | null) => void;
  motionReferenceVideoDurationSec?: number | null;

  negativePrompt: string;
  onNegativePromptChange: (v: string) => void;

  supportsAudioToggle?: boolean;
  audioEnabled?: boolean;
  onAudioEnabledChange?: (v: boolean) => void;
  supportsMultiShot?: boolean;
  shotMode?: 'single' | 'multi';
  onShotModeChange?: (v: 'single' | 'multi') => void;
  multiShotPrompts?: string[];
  onMultiShotPromptsChange?: (v: string[]) => void;
  multiShotDurations?: number[];
  onMultiShotDurationsChange?: (v: number[]) => void;

  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;

  onOpenModelSelector?: () => void;
}

export function VideoGeneratorBottomSheet({
  modelId,
  modelName,
  estimatedCost,
  prompt,
  onPromptChange,
  mode,
  onModeChange,
  availableModes,
  duration,
  onDurationChange,
  durationOptions,
  quality,
  onQualityChange,
  qualityOptions,
  aspectRatio,
  onAspectRatioChange,
  aspectRatioOptions,
  referenceImage,
  onReferenceImageChange,
  motionReferenceVideo = null,
  onMotionReferenceVideoChange,
  motionReferenceVideoDurationSec = null,
  negativePrompt,
  onNegativePromptChange,
  supportsAudioToggle = false,
  audioEnabled = false,
  onAudioEnabledChange,
  supportsMultiShot = false,
  shotMode = 'single',
  onShotModeChange,
  multiShotPrompts = [],
  onMultiShotPromptsChange,
  multiShotDurations = [],
  onMultiShotDurationsChange,
  isGenerating,
  canGenerate,
  onGenerate,
  onOpenModelSelector,
}: VideoGeneratorBottomSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'mode' | 'duration' | 'quality' | 'aspect' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const motionVideoInputRef = useRef<HTMLInputElement>(null);
  const isMotionControl = modelId === 'kling-motion-control'
    || modelId === 'wan-animate-move'
    || modelId === 'wan-animate-replace'
    || modelId === 'kling-o1-edit';

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 36), 80);
    textarea.style.height = `${newHeight}px`;
  }, [prompt]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

  const handleAddRef = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return;
      const file = files[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error("Неподдерживаемый формат. Используйте JPG, PNG или WebP");
        return;
      }

      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxBytes) {
        toast.error(`Изображение слишком большое (${Math.round(file.size / 1024 / 1024)} МБ). Макс. 10 МБ`);
        return;
      }

      // Check image dimensions (min 300x300 for motion control)
      if (isMotionControl) {
        try {
          const dimError = await new Promise<string | null>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(url);
              if (img.naturalWidth < 300 || img.naturalHeight < 300) {
                resolve(`Изображение слишком маленькое (${img.naturalWidth}×${img.naturalHeight}). Мин. 300×300 px`);
              } else {
                resolve(null);
              }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
          });
          if (dimError) { toast.error(dimError); return; }
        } catch {}
      }

      onReferenceImageChange(file);
    },
    [onReferenceImageChange, isMotionControl]
  );

  const handleRemoveRef = useCallback(
    () => onReferenceImageChange(null),
    [onReferenceImageChange]
  );

  const handleAddMotionVideo = useCallback(
    (files: FileList | null) => {
      if (!onMotionReferenceVideoChange || !files || !files.length) return;
      const file = files[0];
      if (!file) return;
      if (!String(file.type || "").startsWith("video/")) {
        toast.error("Выберите видеофайл");
        return;
      }
      const maxBytes = 100 * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error("Макс. размер видео: 100МБ");
        return;
      }
      onMotionReferenceVideoChange(file);
    },
    [onMotionReferenceVideoChange]
  );

  const handleRemoveMotionVideo = useCallback(() => {
    onMotionReferenceVideoChange?.(null);
  }, [onMotionReferenceVideoChange]);

  const handleSubmit = useCallback(() => {
    if (!canGenerate) {
      if (!String(prompt || "").trim() && mode !== 'i2v') toast.error("Введите промпт");
      else toast.error("Недостаточно звёзд");
      return;
    }
    onGenerate();
  }, [canGenerate, onGenerate, prompt, mode]);

  // Get short mode label
  const getModeLabel = (m: string) => {
    if (m === 't2v') return 'Текст→Видео';
    if (m === 'i2v') return 'Фото→Видео';
    if (m === 'i2i') return 'Фото→Фото';
    if (m === 'start_end') return 'Старт→Конец';
    if (m === 'v2v') return 'Видео→Видео';
    if (m === 'motion_control') return 'Motion';
    return m;
  };

  const isKlingMotion = modelId === 'kling-motion-control';
  const isWanAnimate = modelId === 'wan-animate-move' || modelId === 'wan-animate-replace';
  const isKlingO1Edit = modelId === 'kling-o1-edit';

  // Per-model upload labels
  const photoLabel = isKlingMotion || modelId === 'wan-animate-move'
    ? 'Фото'
    : modelId === 'wan-animate-replace'
      ? 'Лицо'
      : isKlingO1Edit
        ? 'Реф'
        : 'Фото';
  const videoLabel = isKlingO1Edit ? 'Видео' : 'Видео';

  // Get short quality label (with per-second price for motion control)
  const getQualityLabel = (q: string) => {
    const lower = q.toLowerCase();
    if (isKlingMotion) {
      if (lower.includes('1080p') || lower.includes('hd')) return '1080p • 9⭐/с';
      if (lower.includes('720p')) return '720p • 6⭐/с';
    }
    if (isWanAnimate) {
      if (lower.includes('1080p') || lower.includes('hd')) return '1080p';
      if (lower.includes('720p')) return '720p';
    }
    if (isKlingO1Edit) {
      // Duration-based quality: "5" or "10"
      if (q === '5') return '5с • 75⭐';
      if (q === '10') return '10с • 150⭐';
    }
    if (lower.includes('1080p') || lower.includes('hd')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('4k') || lower.includes('2160p')) return '4K';
    return q || 'Авто';
  };

  const getAspectLabel = (value: string) => {
    const v = String(value || '').trim();
    if (!v) return 'Авто';
    if (v === 'source') return 'Исходное';
    return v.replace('/', ':');
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const referencePreviewUrl = useMemo(() => {
    if (!referenceImage) return null;
    return URL.createObjectURL(referenceImage);
  }, [referenceImage]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  const needsReference = isMotionControl || mode === 'i2v' || mode === 'i2i';

  return (
    <div className="fixed left-0 right-0 bottom-0 z-40">
      {/* Backdrop for closing menus */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActiveMenu(null)} 
        />
      )}

      {/* Popup menus */}
      <AnimatePresence>
        {activeMenu === 'mode' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-3 z-50 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,255,255,0.10)] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
          >
            <div className="p-1">
              {availableModes.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onModeChange(opt);
                    setActiveMenu(null);
                  }}
                  className={`w-full min-w-[140px] px-4 py-3 text-left text-sm rounded-xl ${
                    opt === mode 
                      ? 'bg-[#8cf425] text-black font-semibold' 
                      : 'text-white active:bg-white/10'
                  }`}
                >
                  {getModeLabel(opt)}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeMenu === 'duration' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-28 z-50 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,255,255,0.10)] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
          >
            <div className="p-1 flex gap-1">
              {durationOptions.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    onDurationChange(dur);
                    setActiveMenu(null);
                  }}
                  className={`w-16 h-12 text-sm font-bold rounded-xl ${
                    dur === duration 
                      ? 'bg-[#8cf425] text-black' 
                      : 'text-white active:bg-white/10'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeMenu === 'quality' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed right-20 z-50 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,255,255,0.10)] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
          >
            <div className="p-1">
              {qualityOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onQualityChange(opt);
                    setActiveMenu(null);
                  }}
                  className={`w-full min-w-[100px] px-4 py-3 text-left text-sm rounded-xl ${
                    opt === quality 
                      ? 'bg-[#8cf425] text-black font-semibold' 
                      : 'text-white active:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeMenu === 'aspect' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed right-3 z-50 bg-[rgba(20,20,20,0.95)] border border-[rgba(255,255,255,0.10)] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
          >
            <div className="p-1">
              {aspectRatioOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onAspectRatioChange(opt);
                    setActiveMenu(null);
                  }}
                  className={`w-full min-w-[100px] px-4 py-3 text-left text-sm rounded-xl ${
                    opt === aspectRatio
                      ? 'bg-[#8cf425] text-black font-semibold'
                      : 'text-white active:bg-white/10'
                  }`}
                >
                  {getAspectLabel(opt)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <div
        className="w-full bg-[rgba(10,10,10,0.95)] border-t border-[rgba(255,255,255,0.08)] backdrop-blur-xl"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {/* Reference image preview (if uploaded) — compact thumbnail */}
        {referencePreviewUrl && (
          <div className="px-3 pt-1.5 pb-1">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.10)] flex-shrink-0">
                <img src={referencePreviewUrl} alt="reference" className="w-full h-full object-cover" />
                {!isGenerating && (
                  <button
                    type="button"
                    onClick={handleRemoveRef}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
              <div className="text-[11px] text-white/50">Референс</div>
            </div>
          </div>
        )}
        {/* Motion control upload chips removed — merged into Quick chips row below */}

        {/* Advanced settings panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-[rgba(255,255,255,0.08)]"
            >
              <div className="px-3 py-3 space-y-2.5">
                <div>
                  <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1 block">
                    Негативный промпт
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => onNegativePromptChange(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Что исключить..."
                    className="w-full h-9 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#8cf425]/30"
                  />
                </div>

                <div className="flex items-center justify-between h-8 px-3 bg-white/5 rounded-lg">
                  <span className="text-[10px] text-white/40">Модель</span>
                  <span className="text-[11px] font-medium text-white/80">{modelName}</span>
                </div>
                {supportsMultiShot && (
                  <div className="text-[10px] text-white/45 leading-snug px-1">
                    Input format: JPG/JPEG/PNG/WEBP/GIF/AVIF, max 10MB.
                  </div>
                )}

                {supportsAudioToggle && onAudioEnabledChange && (
                  <div className="flex items-center justify-between h-9 px-3 bg-white/5 rounded-lg">
                    <span className="text-[11px] text-white/70">Generate audio</span>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => onAudioEnabledChange(!audioEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        audioEnabled ? 'bg-[#8cf425]' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          audioEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {supportsMultiShot && onShotModeChange && onMultiShotPromptsChange && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Shot Mode</div>
                    <div className="text-[10px] text-white/45">
                      Один референс применяется ко всем шотам (ограничение O3 Standard).
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => onShotModeChange('single')}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                          shotMode === 'single' ? 'bg-[#8cf425] text-black' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        Single shot
                      </button>
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => onShotModeChange('multi')}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold ${
                          shotMode === 'multi' ? 'bg-[#8cf425] text-black' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        Multi-shot
                      </button>
                    </div>
                    {shotMode === 'multi' && (
                      <div className="space-y-1.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={multiShotPrompts[idx] || ''}
                              onChange={(e) => {
                                const next = [...multiShotPrompts];
                                while (next.length < 4) next.push('');
                                next[idx] = e.target.value;
                                onMultiShotPromptsChange(next);
                              }}
                              disabled={isGenerating}
                              placeholder={`Shot ${idx + 1} prompt`}
                              className="flex-1 h-8 px-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/20"
                            />
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={multiShotDurations[idx] ?? 2}
                              onChange={(e) => {
                                if (!onMultiShotDurationsChange) return;
                                const next = [...multiShotDurations];
                                while (next.length < 4) next.push(2);
                                const raw = Number(e.target.value || 2);
                                next[idx] = Number.isFinite(raw) ? Math.max(1, Math.min(15, Math.round(raw))) : 2;
                                onMultiShotDurationsChange(next);
                              }}
                              disabled={isGenerating || !onMultiShotDurationsChange}
                              className="w-16 h-8 px-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl text-white text-xs text-center focus:outline-none focus:border-white/20"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick chips row */}
        <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          {/* Mode chip — hide for motion control (single mode, no need) */}
          {!isMotionControl && availableModes.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'mode' ? null : 'mode')}
              disabled={isGenerating}
              className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap
                ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                ${activeMenu === 'mode'
                  ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-[rgba(255,255,255,0.10)]'
                }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span className="text-[11px]">{getModeLabel(mode)}</span>
            </button>
          )}

          {/* Duration chip — hidden for motion control (duration = video length, shown in video chip) */}
          {!isMotionControl && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'duration' ? null : 'duration')}
              disabled={isGenerating}
              className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all
                ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                ${activeMenu === 'duration'
                  ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-[rgba(255,255,255,0.10)]'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{duration}s</span>
            </button>
          )}

          {/* Aspect ratio chip — hidden for motion control (always 'source', not useful) */}
          {!isMotionControl && aspectRatioOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'aspect' ? null : 'aspect')}
              disabled={isGenerating}
              className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all
                ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                ${activeMenu === 'aspect'
                  ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-[rgba(255,255,255,0.10)]'
                }`}
            >
              <span>{getAspectLabel(aspectRatio)}</span>
            </button>
          )}

          {/* Motion control: upload chips inline */}
          {isMotionControl && (
            <>
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isGenerating}
                className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0
                  ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                  ${referenceImage
                    ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                    : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-dashed border-[rgba(255,255,255,0.15)]'
                  }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{referenceImage ? `${photoLabel} ✓` : photoLabel}</span>
              </button>
              {referenceImage && (
                <button
                  type="button"
                  onClick={handleRemoveRef}
                  disabled={isGenerating}
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/15 text-red-300 border border-red-400/30 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => motionVideoInputRef.current?.click()}
                disabled={isGenerating}
                className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0
                  ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                  ${motionReferenceVideo
                    ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                    : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-dashed border-[rgba(255,255,255,0.15)]'
                  }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{motionReferenceVideo ? `${videoLabel} ${motionReferenceVideoDurationSec ? `${Math.round(motionReferenceVideoDurationSec)}s` : '✓'}` : videoLabel}</span>
              </button>
              {motionReferenceVideo && (
                <button
                  type="button"
                  onClick={handleRemoveMotionVideo}
                  disabled={isGenerating}
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/15 text-red-300 border border-red-400/30 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}

          {/* Quality chip */}
          {qualityOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
              disabled={isGenerating}
              className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all
                ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                ${activeMenu === 'quality'
                  ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-[rgba(255,255,255,0.10)]'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{getQualityLabel(quality)}</span>
            </button>
          )}

          {/* Hidden file inputs — always rendered so refs work */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isGenerating}
            onChange={(e) => handleAddRef(e.target.files)}
          />
          <input
            ref={motionVideoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            disabled={isGenerating}
            onChange={(e) => handleAddMotionVideo(e.target.files)}
          />

          {/* Image upload chip (for i2v mode, skip for motion control — has dedicated upload section above) */}
          {needsReference && !isMotionControl && (
            <>
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isGenerating}
                className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all
                  ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                  ${referenceImage
                    ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                    : 'bg-[rgba(255,255,255,0.05)] text-white/80 border border-[rgba(255,255,255,0.10)]'
                  }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {referenceImage ? <span>✓</span> : <span>Реф</span>}
              </button>
              {referenceImage && (
                <button
                  type="button"
                  onClick={handleRemoveRef}
                  disabled={isGenerating}
                  className={`h-10 px-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all
                    ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                    bg-red-500/15 text-red-300 border border-red-400/30`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Удалить</span>
                </button>
              )}
            </>
          )}
          {/* Motion control video chip (compact) — only in chip bar, dedicated upload is above */}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cost badge */}
          <span className="text-xs font-bold text-[#8cf425] pr-1">
            {estimatedCost}⭐
          </span>
        </div>

        {/* Input row */}
        <div className="px-3 pb-2 flex items-end gap-2">
          {/* Settings button */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isGenerating}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
              ${showAdvanced
                ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.4)]'
                : 'bg-[rgba(255,255,255,0.05)] text-white/60 border border-[rgba(255,255,255,0.10)]'
              }
              ${isGenerating ? 'opacity-50' : ''}`}
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>

          {/* Prompt input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
              placeholder={isKlingO1Edit ? "Опишите изменения (обязательно)..." : isMotionControl ? "Промпт (опционально)..." : needsReference ? "Опишите желаемое видео (опционально)..." : "Опишите видео..."}
              rows={1}
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl text-white text-sm placeholder:text-white/40 resize-none focus:outline-none focus:border-[#8cf425]/40 transition-all disabled:opacity-50 leading-tight"
              style={{ minHeight: '40px', maxHeight: '80px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isGenerating || !canGenerate}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
              ${isGenerating
                ? 'bg-[rgba(255,255,255,0.05)] text-white/50'
                : canGenerate
                  ? 'bg-[#8cf425] text-black shadow-[0_0_16px_-3px_rgba(140,244,37,0.5)]'
                  : 'bg-[rgba(255,255,255,0.05)] text-white/30 border border-[rgba(255,255,255,0.10)]'
              }`}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
