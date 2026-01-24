'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Settings, Loader2, X, Send, ImagePlus, Square, RectangleVertical, RectangleHorizontal, Sparkles, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getModelById } from "@/config/models";

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
}

// Tiny chip component for quick settings
function Chip({ 
  children, 
  active, 
  onClick, 
  disabled 
}: { 
  children: React.ReactNode; 
  active?: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all whitespace-nowrap
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${active 
          ? 'bg-[#CDFF00] text-black' 
          : 'bg-white/8 text-white/70 hover:bg-white/12 border border-white/10'
        }
      `}
    >
      {children}
    </button>
  );
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
}: GeneratorBottomSheetProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showQuantityMenu, setShowQuantityMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Close all menus
  const closeAllMenus = () => {
    setShowAspectMenu(false);
    setShowQualityMenu(false);
    setShowQuantityMenu(false);
  };

  // Get short quality label
  const getQualityLabel = (q: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('ultra') || lower.includes('4k')) return '4K';
    if (lower.includes('high') || lower.includes('2k') || lower.includes('hd')) return 'HD';
    return 'SD';
  };

  // Get short aspect label
  const getAspectLabel = (a: string) => {
    return a.replace(':', '∶');
  };

  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-40"
      style={{ pointerEvents: "none" }}
    >
      {/* Click outside to close menus */}
      {(showAspectMenu || showQualityMenu || showQuantityMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          style={{ pointerEvents: "auto" }}
          onClick={closeAllMenus} 
        />
      )}

      <div
        className="mx-auto w-full bg-[#0C0C0D]/98 border-t border-white/10 backdrop-blur-xl"
        style={{ 
          pointerEvents: "auto",
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
        }}
      >
        {/* Reference images (if any) */}
        {referenceImages.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {referenceImages.map((src, idx) => (
                <div key={idx} className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
                  <img src={src} alt={`ref-${idx + 1}`} className="w-full h-full object-cover" />
                  {!isGenerating && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRefAt(idx)}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500/90 flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                </div>
              ))}
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
                {/* Negative prompt */}
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

                {/* Seed row */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1 block">
                      Seed
                    </label>
                    <input
                      type="number"
                      value={seed ?? ''}
                      onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={isGenerating}
                      placeholder="Случайный"
                      className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onSeedChange(Math.floor(Math.random() * 999999999))}
                    disabled={isGenerating}
                    className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10"
                  >
                    🎲
                  </button>
                </div>

                {/* Model info */}
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
          {/* Aspect ratio chip */}
          <div className="relative">
            <Chip 
              active={showAspectMenu}
              onClick={() => {
                closeAllMenus();
                setShowAspectMenu(!showAspectMenu);
              }}
              disabled={isGenerating}
            >
              <AspectIcon ratio={aspectRatio} className="w-3 h-3" />
              <span>{getAspectLabel(aspectRatio)}</span>
            </Chip>
            
            <AnimatePresence>
              {showAspectMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#1C1C1E] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[100px]"
                >
                  {aspectRatioOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onAspectRatioChange(opt);
                        setShowAspectMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                        opt === aspectRatio ? 'bg-[#CDFF00] text-black font-semibold' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <AspectIcon ratio={opt} className="w-3.5 h-3.5" />
                      {getAspectLabel(opt)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quality chip */}
          <div className="relative">
            <Chip 
              active={showQualityMenu}
              onClick={() => {
                closeAllMenus();
                setShowQualityMenu(!showQualityMenu);
              }}
              disabled={isGenerating}
            >
              <Sparkles className="w-3 h-3" />
              <span>{getQualityLabel(quality)}</span>
            </Chip>
            
            <AnimatePresence>
              {showQualityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute bottom-full left-0 mb-2 bg-[#1C1C1E] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[100px]"
                >
                  {qualityOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onQualityChange(opt);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm ${
                        opt === quality ? 'bg-[#CDFF00] text-black font-semibold' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quantity chip */}
          {onQuantityChange && (
            <div className="relative">
              <Chip 
                active={showQuantityMenu}
                onClick={() => {
                  closeAllMenus();
                  setShowQuantityMenu(!showQuantityMenu);
                }}
                disabled={isGenerating}
              >
                <span>×{quantity}</span>
              </Chip>
              
              <AnimatePresence>
                {showQuantityMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full left-0 mb-2 bg-[#1C1C1E] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="flex">
                      {Array.from({ length: quantityMax }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            onQuantityChange(n);
                            setShowQuantityMenu(false);
                          }}
                          className={`w-10 h-10 text-sm font-bold ${
                            n === quantity ? 'bg-[#CDFF00] text-black' : 'text-white hover:bg-white/10'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Image upload chip */}
          {supportsI2i && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept={allowedMimeTypes}
                multiple={maxInputImages > 1}
                className="hidden"
                disabled={isGenerating}
                onChange={(e) => handleAddRefs(e.target.files)}
              />
              <Chip active={referenceImages.length > 0} onClick={() => {}} disabled={isGenerating}>
                <ImagePlus className="w-3 h-3" />
                {referenceImages.length > 0 && <span>{referenceImages.length}</span>}
              </Chip>
            </label>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cost badge */}
          <span className="text-[11px] font-semibold text-[#CDFF00] flex items-center gap-0.5 pr-1">
            {totalCost}⭐
          </span>
        </div>

        {/* Input row - messenger style */}
        <div className="px-3 pb-2 flex items-end gap-2">
          {/* Settings button */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isGenerating}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
              ${showAdvanced 
                ? 'bg-[#CDFF00] text-black' 
                : 'bg-white/8 text-white/60 hover:bg-white/12 border border-white/10'
              }
              ${isGenerating ? 'opacity-50' : ''}
            `}
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>

          {/* Prompt input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={isGenerating}
              placeholder="Опишите изображение..."
              rows={1}
              className="w-full px-4 py-2.5 bg-white/8 border border-white/10 rounded-2xl text-white text-sm placeholder:text-white/40 resize-none focus:outline-none focus:border-[#CDFF00]/40 transition-all disabled:opacity-50 leading-tight"
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
            className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95
              ${isGenerating
                ? 'bg-white/10 text-white/50'
                : canGenerate
                  ? 'bg-[#CDFF00] text-black shadow-lg shadow-[#CDFF00]/30 hover:bg-[#B8E600]'
                  : 'bg-white/8 text-white/30 cursor-not-allowed border border-white/10'
              }
            `}
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
