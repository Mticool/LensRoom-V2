'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Settings, Loader2, X, Send, ImagePlus, Sparkles, ChevronUp, Film, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getModelById } from "@/config/models";
import { STUDIO_VIDEO_MODELS } from "@/config/studioModels";

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

  referenceImage: File | null;
  onReferenceImageChange: (v: File | null) => void;

  negativePrompt: string;
  onNegativePromptChange: (v: string) => void;

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
  referenceImage,
  onReferenceImageChange,
  negativePrompt,
  onNegativePromptChange,
  isGenerating,
  canGenerate,
  onGenerate,
  onOpenModelSelector,
}: VideoGeneratorBottomSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'mode' | 'duration' | 'quality' | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      if (!String(file.type || "").startsWith("image/")) {
        toast.error("Выберите изображение");
        return;
      }
      
      const maxBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxBytes) {
        toast.error("Макс. размер: 10МБ");
        return;
      }
      
      onReferenceImageChange(file);
    },
    [onReferenceImageChange]
  );

  const handleRemoveRef = useCallback(
    () => onReferenceImageChange(null),
    [onReferenceImageChange]
  );

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
    if (m === 'start_end') return 'Старт→Конец';
    if (m === 'v2v') return 'Видео→Видео';
    return m;
  };

  // Get short quality label
  const getQualityLabel = (q: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('1080p') || lower.includes('hd')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('4k') || lower.includes('2160p')) return '4K';
    return q || 'Авто';
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

  const needsReference = mode === 'i2v';

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
            className="fixed left-3 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
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
                      ? 'bg-[#CDFF00] text-black font-semibold' 
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
            className="fixed left-28 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
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
                      ? 'bg-[#CDFF00] text-black' 
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
            className="fixed right-20 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
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
                      ? 'bg-[#CDFF00] text-black font-semibold' 
                      : 'text-white active:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <div
        className="w-full bg-[#0C0C0D]/98 border-t border-white/10 backdrop-blur-xl"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {/* Reference image preview (if uploaded) */}
        {referencePreviewUrl && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                <img src={referencePreviewUrl} alt="reference" className="w-full h-full object-cover" />
                {!isGenerating && (
                  <button
                    type="button"
                    onClick={handleRemoveRef}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
              <div className="text-xs text-white/60">Референс</div>
            </div>
          </div>
        )}

        {/* Advanced settings panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-white/10"
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
                    className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>

                <div className="flex items-center justify-between h-8 px-3 bg-white/5 rounded-lg">
                  <span className="text-[10px] text-white/40">Модель</span>
                  <span className="text-[11px] font-medium text-white/80">{modelName}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick chips row */}
        <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
          {/* Mode chip */}
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'mode' ? null : 'mode')}
            disabled={isGenerating}
            className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap
              ${isGenerating ? 'opacity-50' : 'active:scale-95'}
              ${activeMenu === 'mode' 
                ? 'bg-[#CDFF00] text-black' 
                : 'bg-white/10 text-white/80 border border-white/10'
              }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="text-[11px]">{getModeLabel(mode)}</span>
          </button>

          {/* Duration chip */}
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'duration' ? null : 'duration')}
            disabled={isGenerating}
            className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
              ${isGenerating ? 'opacity-50' : 'active:scale-95'}
              ${activeMenu === 'duration' 
                ? 'bg-[#CDFF00] text-black' 
                : 'bg-white/10 text-white/80 border border-white/10'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{duration}s</span>
          </button>

          {/* Quality chip */}
          {qualityOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
              disabled={isGenerating}
              className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
                ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                ${activeMenu === 'quality' 
                  ? 'bg-[#CDFF00] text-black' 
                  : 'bg-white/10 text-white/80 border border-white/10'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{getQualityLabel(quality)}</span>
            </button>
          )}

          {/* Image upload chip (for i2v mode) */}
          {needsReference && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isGenerating}
                onChange={(e) => handleAddRef(e.target.files)}
              />
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isGenerating}
                className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
                  ${isGenerating ? 'opacity-50' : 'active:scale-95'}
                  ${referenceImage 
                    ? 'bg-[#CDFF00] text-black' 
                    : 'bg-white/10 text-white/80 border border-white/10'
                  }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                {referenceImage && <span>✓</span>}
              </button>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cost badge */}
          <span className="text-xs font-bold text-[#CDFF00] pr-1">
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
                ? 'bg-[#CDFF00] text-black' 
                : 'bg-white/10 text-white/60 border border-white/10'
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
              placeholder={needsReference ? "Опишите желаемое видео (опционально)..." : "Опишите видео..."}
              rows={1}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/40 resize-none focus:outline-none focus:border-[#CDFF00]/40 transition-all disabled:opacity-50 leading-tight"
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
                ? 'bg-white/10 text-white/50'
                : canGenerate
                  ? 'bg-[#CDFF00] text-black shadow-lg shadow-[#CDFF00]/30'
                  : 'bg-white/10 text-white/30 border border-white/10'
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
