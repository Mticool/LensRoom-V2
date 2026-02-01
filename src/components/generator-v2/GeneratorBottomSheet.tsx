'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Settings, Loader2, X, Send, ImagePlus, Square, RectangleVertical, RectangleHorizontal, Sparkles, ChevronUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ModelSelector } from "@/components/generator-v2/ModelSelector";
import { getModelById, PHOTO_MODELS } from "@/config/models";

interface GeneratorBottomSheetProps {
  modelId: string;
  modelName: string;
  estimatedCost: number;

  prompt: string;
  onPromptChange: (v: string) => void;

  aspectRatio: string;
  onAspectRatioChange: (v: string) => void;
  aspectRatioOptions: string[];

  quality: string;
  onQualityChange: (v: string) => void;
  qualityOptions: string[];

  quantity?: number;
  onQuantityChange?: (v: number) => void;
  quantityMax?: number;

  supportsI2i: boolean;
  referenceImages: string[];
  onReferenceImagesChange: (v: string[]) => void;

  negativePrompt: string;
  onNegativePromptChange: (v: string) => void;
  seed: number | null;
  onSeedChange: (v: number | null) => void;
  steps: number;
  onStepsChange: (v: number) => void;

  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;

  onOpenMenu: () => void;
  /** When provided, gear opens Settings sheet with model selector. */
  onModelChange?: (modelId: string) => void;
}

// Aspect ratio icon based on value
function AspectIcon({ ratio, className }: { ratio: string; className?: string }) {
  if (ratio.includes('9:16') || ratio.includes('2:3')) {
    return <RectangleVertical className={className} />;
  }
  if (ratio.includes('16:9') || ratio.includes('3:2')) {
    return <RectangleHorizontal className={className} />;
  }
  return <Square className={className} />;
}

export function GeneratorBottomSheet({
  modelId,
  modelName,
  estimatedCost,
  prompt,
  onPromptChange,
  aspectRatio,
  onAspectRatioChange,
  aspectRatioOptions,
  quality,
  onQualityChange,
  qualityOptions,
  quantity = 1,
  onQuantityChange,
  quantityMax = 4,
  supportsI2i,
  referenceImages,
  onReferenceImagesChange,
  negativePrompt,
  onNegativePromptChange,
  seed,
  onSeedChange,
  steps,
  onStepsChange,
  isGenerating,
  canGenerate,
  onGenerate,
  onOpenMenu,
  onModelChange,
}: GeneratorBottomSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'aspect' | 'quality' | 'quantity' | null>(null);
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

  const photoModel = useMemo(() => {
    const m = getModelById(modelId);
    return m && m.type === "photo" ? (m as any) : null;
  }, [modelId]);

  const maxInputImages = useMemo(() => Math.max(1, Number(photoModel?.maxInputImages ?? 1)), [photoModel?.maxInputImages]);
  const maxImageSizeMb = useMemo(() => Math.max(1, Number(photoModel?.maxInputImageSizeMb ?? 10)), [photoModel?.maxInputImageSizeMb]);
  const allowedMimeTypes = useMemo(() => {
    const f = photoModel?.inputImageFormats;
    if (!f || !Array.isArray(f)) return "image/*";
    return f
      .filter((x: any) => x === "jpeg" || x === "png" || x === "webp")
      .map((x: string) => (x === "jpeg" ? "image/jpeg" : x === "png" ? "image/png" : "image/webp"))
      .join(",") || "image/*";
  }, [photoModel?.inputImageFormats]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

  const handleAddRefs = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length || !supportsI2i) return;
      const current = Array.isArray(referenceImages) ? referenceImages : [];
      const remaining = Math.max(0, maxInputImages - current.length);
      if (remaining <= 0) {
        toast.error(`Макс. ${maxInputImages} изображений`);
        return;
      }
      const picked = Array.from(files).slice(0, remaining);
      const maxBytes = maxImageSizeMb * 1024 * 1024;
      for (const f of picked) {
        if (!String(f.type || "").startsWith("image/")) {
          toast.error("Выберите изображение");
          return;
        }
        if (f.size > maxBytes) {
          toast.error(`Макс. размер: ${maxImageSizeMb}МБ`);
          return;
        }
      }
      try {
        const encoded = await Promise.all(picked.map((f) => readFileAsDataUrl(f)));
        onReferenceImagesChange([...current, ...encoded].slice(0, maxInputImages));
      } catch {
        toast.error("Ошибка чтения файла");
      }
    },
    [supportsI2i, referenceImages, maxInputImages, maxImageSizeMb, onReferenceImagesChange]
  );

  const handleRemoveRefAt = useCallback(
    (idx: number) => onReferenceImagesChange((referenceImages || []).filter((_, i) => i !== idx)),
    [referenceImages, onReferenceImagesChange]
  );

  const handleSubmit = useCallback(() => {
    if (!canGenerate) {
      if (!String(prompt || "").trim()) toast.error("Введите промпт");
      else toast.error("Недостаточно звёзд");
      return;
    }
    onGenerate();
  }, [canGenerate, onGenerate, prompt]);

  const totalCost = estimatedCost * quantity;

  // Get short quality label
  const getQualityLabel = (q: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('ultra') || lower.includes('4k')) return '4K';
    if (lower.includes('high') || lower.includes('2k') || lower.includes('hd')) return 'HD';
    return 'SD';
  };

  // Get short aspect label
  const getAspectLabel = (a: string) => a.replace(':', '∶');

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="md:hidden fixed left-0 right-0 bottom-0 z-40"
      style={{ 
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Backdrop for closing menus */}
      {(activeMenu || modelMenuOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setActiveMenu(null);
            setModelMenuOpen(false);
          }}
          style={{ touchAction: 'manipulation' }}
        />
      )}

      {/* Popup menus - rendered at root level for proper z-index */}
      <AnimatePresence>
        {activeMenu === 'aspect' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="fixed left-3 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity'
            }}
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
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full min-w-[120px] px-4 py-3.5 text-left text-sm flex items-center gap-3 rounded-xl transition-colors ${
                    opt === aspectRatio 
                      ? 'bg-[#f59e0b] text-black font-semibold' 
                      : 'text-white active:bg-white/10 hover:bg-white/5'
                  }`}
                >
                  <AspectIcon ratio={opt} className="w-4 h-4" />
                  {getAspectLabel(opt)}
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
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="fixed left-20 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity'
            }}
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
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full min-w-[120px] px-4 py-3.5 text-left text-sm rounded-xl transition-colors ${
                    opt === quality 
                      ? 'bg-[#f59e0b] text-black font-semibold' 
                      : 'text-white active:bg-white/10 hover:bg-white/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeMenu === 'quantity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="fixed left-36 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity'
            }}
          >
            <div className="p-1 flex gap-1">
              {Array.from({ length: quantityMax }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onQuantityChange?.(n);
                    setActiveMenu(null);
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className={`w-12 h-12 text-base font-bold rounded-xl transition-colors ${
                    n === quantity 
                      ? 'bg-[#f59e0b] text-black' 
                      : 'text-white active:bg-white/10 hover:bg-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Model selector dropdown */}
        {modelMenuOpen && onModelChange && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="fixed left-2 right-2 z-50 bg-[#1C1C1E] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            style={{ 
              bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
              transform: 'translateZ(0)',
              willChange: 'transform, opacity',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              {PHOTO_MODELS.map((model) => {
                const isSelected = model.id === modelId;
                
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onModelChange) {
                        onModelChange(model.id);
                        setModelMenuOpen(false);
                      }
                    }}
                    style={{ touchAction: 'manipulation', pointerEvents: 'auto' }}
                    className={`w-full px-4 py-3.5 text-left text-sm transition-colors rounded-xl ${
                      isSelected
                        ? 'bg-[#f59e0b] text-black font-semibold' 
                        : 'text-white active:bg-white/10 hover:bg-white/5'
                    }`}
                  >
                    {model.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <div
        className="w-full bg-[#0C0C0D]/98 border-t border-white/10 backdrop-blur-xl"
        style={{ 
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        {/* Reference images area - supports drag and drop */}
        <div 
          className={`px-2 pt-2.5 pb-1.5 ${supportsI2i ? 'relative drag-drop-zone' : ''}`}
          onDragOver={(e) => {
            if (!supportsI2i) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            const target = e.currentTarget;
            if (!target.classList.contains('drag-over')) {
              target.classList.add('drag-over');
            }
          }}
          onDragLeave={(e) => {
            const target = e.currentTarget;
            if (!target.contains(e.relatedTarget as Node)) {
              target.classList.remove('drag-over');
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('drag-over');
            
            if (!supportsI2i) return;
            
            try {
              const data = e.dataTransfer.getData('application/json');
              if (data) {
                const imageData = JSON.parse(data);
                if (imageData.url) {
                  // Fetch image and convert to data URL
                  const response = await fetch(imageData.url);
                  const blob = await response.blob();
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    onReferenceImagesChange([dataUrl]);
                    toast.success('Фото добавлено');
                  };
                  reader.readAsDataURL(blob);
                  return;
                }
              }
              
              // Fallback: try to get file from dataTransfer
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0 && files[0].type.startsWith('image/')) {
                const file = files[0];
                const reader = new FileReader();
                reader.onloadend = () => {
                  const dataUrl = reader.result as string;
                  onReferenceImagesChange([dataUrl]);
                  toast.success('Фото добавлено');
                };
                reader.readAsDataURL(file);
              }
            } catch (error) {
              console.error('Drop error:', error);
              toast.error('Не удалось загрузить фото');
            }
          }}
          style={{
            minHeight: referenceImages.length > 0 ? 'auto' : '0px',
            border: supportsI2i ? '2px dashed transparent' : 'none',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          {referenceImages.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {referenceImages.map((src, idx) => (
                <div key={idx} className="relative w-11 h-11 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                  <img src={src} alt={`ref-${idx + 1}`} className="w-full h-full object-cover" />
                  {!isGenerating && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRefAt(idx)}
                      style={{ touchAction: 'manipulation' }}
                      className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500/90 flex items-center justify-center active:bg-red-600/90"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Advanced settings panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden border-b border-white/10"
              style={{ transform: 'translateZ(0)' }}
            >
              <div className="px-2 py-3 space-y-2.5">
                <div>
                  <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                    Негативный промпт
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => onNegativePromptChange(e.target.value)}
                    disabled={isGenerating}
                    placeholder="Что исключить..."
                    style={{ touchAction: 'manipulation' }}
                    className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5 block">
                      Seed
                    </label>
                    <input
                      type="number"
                      value={seed ?? ''}
                      onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={isGenerating}
                      placeholder="Случайный"
                      style={{ touchAction: 'manipulation' }}
                      className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onSeedChange(Math.floor(Math.random() * 999999999))}
                    disabled={isGenerating}
                    style={{ touchAction: 'manipulation' }}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm active:bg-white/10 active:opacity-70"
                  >
                    🎲
                  </button>
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
        <div className="px-2 py-2.5 flex items-center gap-2 flex-wrap">
          {/* Aspect ratio chip */}
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'aspect' ? null : 'aspect')}
            disabled={isGenerating}
            style={{ touchAction: 'manipulation' }}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[60px] justify-center
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:opacity-70'}
              ${activeMenu === 'aspect' 
                ? 'bg-[#f59e0b] text-black shadow-sm' 
                : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
              }`}
          >
            <AspectIcon ratio={aspectRatio} className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{getAspectLabel(aspectRatio)}</span>
          </button>

          {/* Quality chip */}
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
            disabled={isGenerating}
            style={{ touchAction: 'manipulation' }}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[50px] justify-center
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:opacity-70'}
              ${activeMenu === 'quality' 
                ? 'bg-[#f59e0b] text-black shadow-sm' 
                : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{getQualityLabel(quality)}</span>
          </button>

          {/* Quantity chip */}
          {onQuantityChange && (
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === 'quantity' ? null : 'quantity')}
              disabled={isGenerating}
              style={{ touchAction: 'manipulation' }}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors min-w-[45px] justify-center
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:opacity-70'}
                ${activeMenu === 'quantity' 
                  ? 'bg-[#f59e0b] text-black shadow-sm' 
                  : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                }`}
            >
              <span className="whitespace-nowrap">×{quantity}</span>
            </button>
          )}

          {/* Image upload chip */}
          {supportsI2i && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={allowedMimeTypes}
                multiple={maxInputImages > 1}
                className="hidden"
                disabled={isGenerating}
                onChange={(e) => handleAddRefs(e.target.files)}
              />
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isGenerating}
                style={{ touchAction: 'manipulation' }}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors min-w-[45px] justify-center
                  ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:opacity-70'}
                  ${referenceImages.length > 0 
                    ? 'bg-[#f59e0b] text-black shadow-sm' 
                    : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15'
                  }`}
              >
                <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" />
                {referenceImages.length > 0 && <span className="whitespace-nowrap">{referenceImages.length}</span>}
              </button>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-[20px]" />

          {/* Cost badge */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs font-bold text-[#f59e0b]">
              {totalCost}⭐
            </span>
          </div>
        </div>

        {/* Input row */}
        <div className="px-2 pb-3 flex items-end gap-2.5">
          {/* Settings (gear): open model picker */}
          <button
            type="button"
            onClick={() => {
              if (onModelChange) {
                setModelMenuOpen(!modelMenuOpen);
                setActiveMenu(null);
              } else {
                setShowAdvanced(!showAdvanced);
              }
            }}
            disabled={isGenerating}
            style={{ touchAction: 'manipulation' }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0
              ${showAdvanced || modelMenuOpen
                ? 'bg-[#f59e0b] text-black shadow-sm' 
                : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/15'
              }
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'active:opacity-70'}`}
          >
            <Settings className="w-4.5 h-4.5" />
          </button>

          {/* Prompt input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
              placeholder="Опишите изображение..."
              rows={1}
              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/40 resize-none focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all disabled:opacity-50 leading-tight"
              style={{ 
                minHeight: '44px', 
                maxHeight: '88px',
                touchAction: 'manipulation'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Only submit if can generate (prevents accidental triggers)
                  if (canGenerate && !isGenerating) {
                    handleSubmit();
                  }
                }
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isGenerating || !canGenerate}
            style={{ touchAction: 'manipulation' }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0
              ${isGenerating
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : canGenerate
                  ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/30 active:opacity-80 active:scale-95'
                  : 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
          >
            {isGenerating ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Send className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop Dialog */}
      {onModelChange && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="hidden md:grid w-[min(96vw,420px)] max-h-[85vh] overflow-y-auto border border-white/10 bg-[#0B0B0C] text-white p-4 gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Выбор нейросети</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Нейросеть</div>
                <ModelSelector
                  value={modelId}
                  onChange={(id) => {
                    onModelChange(id);
                    setSettingsOpen(false);
                  }}
                  direction="down"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
