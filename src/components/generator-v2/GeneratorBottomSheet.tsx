 'use client';
 
 import { useCallback, useMemo, useRef, useState } from "react";
 import { ChevronUp, ChevronDown, MoreHorizontal, Star, Loader2, X } from "lucide-react";
 import { toast } from "sonner";
 
 import { PromptInput } from "@/components/generator-v2/PromptInput";
 import { QualitySelector } from "@/components/generator-v2/QualitySelector";
 import { AspectRatioSelector } from "@/components/generator-v2/AspectRatioSelector";
 import { AdvancedSettingsCollapse } from "@/components/generator-v2/AdvancedSettingsCollapse";
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
 
 function clamp(n: number, min: number, max: number) {
   return Math.max(min, Math.min(max, n));
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
   const [expanded, setExpanded] = useState(false);
   const dragRef = useRef<{ y: number; t: number } | null>(null);
 
   const collapsedHeightPx = 86;
 
   const displayPrompt = useMemo(() => {
     const s = String(prompt || "").trim();
     return s || "Введите промпт…";
   }, [prompt]);
 
   const photoModel = useMemo(() => {
     const m = getModelById(modelId);
     return m && m.type === "photo" ? (m as any) : null;
   }, [modelId]);
 
   const maxInputImages = useMemo(() => Math.max(1, Number(photoModel?.maxInputImages ?? 1)), [photoModel?.maxInputImages]);
   const maxImageSizeMb = useMemo(() => Math.max(1, Number(photoModel?.maxInputImageSizeMb ?? 10)), [photoModel?.maxInputImageSizeMb]);
   const allowedFormats: Array<"jpeg" | "png" | "webp"> | null = useMemo(() => {
     const f = photoModel?.inputImageFormats;
     if (!f || !Array.isArray(f)) return null;
     return f.filter((x: any) => x === "jpeg" || x === "png" || x === "webp");
   }, [photoModel?.inputImageFormats]);
   const allowedMimeTypes = useMemo(() => {
     if (!allowedFormats?.length) return null;
     return allowedFormats
       .map((f) => (f === "jpeg" ? "image/jpeg" : f === "png" ? "image/png" : "image/webp"))
       .join(",");
   }, [allowedFormats]);
 
   const onTouchStart = useCallback((e: React.TouchEvent) => {
     const t = e.touches?.[0];
     if (!t) return;
     dragRef.current = { y: t.clientY, t: Date.now() };
   }, []);
 
   const onTouchEnd = useCallback(
     (e: React.TouchEvent) => {
       const start = dragRef.current;
       dragRef.current = null;
       if (!start) return;
       const t = e.changedTouches?.[0];
       if (!t) return;
       const dy = t.clientY - start.y;
       const dt = Date.now() - start.t;
       if (dt > 900) return;
       // swipe up to expand, down to collapse
       if (dy < -40) setExpanded(true);
       if (dy > 40) setExpanded(false);
     },
     []
   );
 
   const readFileAsDataUrl = (file: File): Promise<string> =>
     new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onerror = () => reject(new Error("read_failed"));
       reader.onload = () => resolve(String(reader.result || ""));
       reader.readAsDataURL(file);
     });
 
   const handleAddRefs = useCallback(
     async (files: FileList | null) => {
       if (!files || !files.length) return;
       if (!supportsI2i) return;
 
       const current = Array.isArray(referenceImages) ? referenceImages : [];
       const remaining = Math.max(0, maxInputImages - current.length);
       if (remaining <= 0) {
         toast.error(`Можно добавить максимум ${maxInputImages} изображений`);
         return;
       }
 
       const picked = Array.from(files).slice(0, remaining);
 
       const maxBytes = maxImageSizeMb * 1024 * 1024;
       for (const f of picked) {
         if (!String(f.type || "").startsWith("image/")) {
           toast.error("Выберите изображение");
           return;
         }
         if (allowedFormats?.length && allowedMimeTypes) {
           const mime = String(f.type || "").toLowerCase();
           const ok = allowedMimeTypes.split(",").includes(mime);
           if (!ok) {
             toast.error(`Неподдерживаемый формат. Разрешено: ${allowedFormats.map((x) => x.toUpperCase()).join(", ")}`);
             return;
           }
         }
         if (f.size > maxBytes) {
           toast.error(`Максимальный размер: ${maxImageSizeMb}МБ. Ваш файл: ${(f.size / 1024 / 1024).toFixed(1)}МБ`);
           return;
         }
       }
 
       try {
         const encoded = await Promise.all(picked.map((f) => readFileAsDataUrl(f)));
         const next = [...current, ...encoded].slice(0, maxInputImages);
         onReferenceImagesChange(next);
       } catch {
         toast.error("Не удалось прочитать файл");
       }
     },
     [
       supportsI2i,
       referenceImages,
       maxInputImages,
       maxImageSizeMb,
       allowedFormats,
       allowedMimeTypes,
       onReferenceImagesChange,
     ]
   );
 
   const handleRemoveRefAt = useCallback(
     (idx: number) => {
       const next = (referenceImages || []).filter((_, i) => i !== idx);
       onReferenceImagesChange(next);
     },
     [referenceImages, onReferenceImagesChange]
   );
 
   const handleClearRefs = useCallback(() => onReferenceImagesChange([]), [onReferenceImagesChange]);
 
   const handleSubmit = useCallback(() => {
     if (!canGenerate) {
       if (!String(prompt || "").trim()) toast.error("Введите промпт");
       else toast.error("Недостаточно звёзд или генерация недоступна");
       return;
     }
     onGenerate();
     setExpanded(false);
   }, [canGenerate, onGenerate, prompt]);
 
   const sheetHeight = expanded ? "70dvh" : `${collapsedHeightPx}px`;
   const title = modelName || modelId;
 
   return (
     <div
       className="md:hidden fixed left-0 right-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
       style={{ pointerEvents: "none" }}
     >
       <div
         className="mx-auto w-full max-w-[640px] bg-[#18181B]/95 border border-[#27272A] rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
         style={{ height: sheetHeight, pointerEvents: "auto" }}
       >
         {/* Handle / collapsed bar */}
         <div
           className="px-4 pt-2 pb-3 border-b border-white/10"
           onClick={() => setExpanded((v) => !v)}
           onTouchStart={onTouchStart}
           onTouchEnd={onTouchEnd}
           role="button"
           aria-label="Toggle generator panel"
         >
           <div className="flex items-center justify-center">
             <div className="w-10 h-1.5 rounded-full bg-white/15" />
           </div>
 
           <div className="mt-2 flex items-center gap-3">
             <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-semibold text-white/80 truncate">{title}</span>
                 <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#CDFF00]">
                   <Star className="w-3.5 h-3.5" />
                   {estimatedCost}
                 </span>
               </div>
               <div className="mt-1 text-[12px] text-white/50 truncate">{displayPrompt}</div>
             </div>
 
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 onOpenMenu();
               }}
               className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center"
               title="Меню"
             >
               <MoreHorizontal className="w-5 h-5" />
             </button>
 
             <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center">
               {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
             </div>
           </div>
         </div>
 
        {/* Expanded content */}
        {expanded ? (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
               <div className="text-xs text-white/60 uppercase tracking-wider">Промпт</div>
               <PromptInput
                 value={prompt}
                 onChange={onPromptChange}
                 disabled={isGenerating}
                 placeholder="Опишите сцену…"
                 onSubmit={handleSubmit}
               />
 
               <div className="grid grid-cols-1 gap-3">
                 <div className="space-y-2">
                   <div className="text-xs text-white/60 uppercase tracking-wider">Формат</div>
                   <AspectRatioSelector
                     value={aspectRatio}
                     onChange={onAspectRatioChange}
                     options={aspectRatioOptions}
                     disabled={isGenerating}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <div className="text-xs text-white/60 uppercase tracking-wider">Качество</div>
                   <QualitySelector
                     value={quality}
                     onChange={onQualityChange}
                     options={qualityOptions}
                     disabled={isGenerating}
                   />
                 </div>
               </div>
 
               {supportsI2i ? (
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <div className="text-xs text-white/60 uppercase tracking-wider">Референсы</div>
                     {referenceImages.length ? (
                       <button
                         type="button"
                         onClick={handleClearRefs}
                         disabled={isGenerating}
                         className="text-xs text-white/50 hover:text-white/80"
                       >
                         Очистить
                       </button>
                     ) : null}
                   </div>
 
                   <div className="flex items-center gap-2 flex-wrap">
                     <label className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm cursor-pointer">
                       <input
                         type="file"
                         accept={allowedMimeTypes || "image/*"}
                         multiple={maxInputImages > 1}
                         className="hidden"
                         disabled={isGenerating}
                         onChange={(e) => handleAddRefs(e.target.files)}
                       />
                       Добавить
                     </label>
                     <div className="text-xs text-white/40">
                       {referenceImages.length}/{maxInputImages} • до {maxImageSizeMb}МБ
                     </div>
                   </div>
 
                   {referenceImages.length ? (
                     <div className="flex items-center gap-2 flex-wrap">
                       {referenceImages.map((src, idx) => (
                         <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                           <img src={src} alt={`ref-${idx + 1}`} className="w-full h-full object-cover" />
                           {!isGenerating ? (
                             <button
                               type="button"
                               onClick={() => handleRemoveRefAt(idx)}
                               className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center"
                               title="Удалить"
                             >
                               <X className="w-3.5 h-3.5 text-white" />
                             </button>
                           ) : null}
                         </div>
                       ))}
                     </div>
                   ) : null}
                 </div>
               ) : null}
 
               <div className="space-y-2">
                 <div className="text-xs text-white/60 uppercase tracking-wider">Дополнительно</div>
                 <AdvancedSettingsCollapse
                   negativePrompt={negativePrompt}
                   onNegativePromptChange={onNegativePromptChange}
                   seed={seed}
                   onSeedChange={onSeedChange}
                   steps={steps}
                   onStepsChange={onStepsChange}
                   disabled={isGenerating}
                 />
               </div>
 
               <button
                 type="button"
                 onClick={handleSubmit}
                 disabled={isGenerating || !canGenerate}
                 className={`w-full h-12 rounded-2xl font-semibold transition ${
                   isGenerating
                     ? "bg-[#2C2C2E] text-white/70"
                     : canGenerate
                       ? "bg-[#CDFF00] text-black hover:bg-[#B8E600]"
                       : "bg-[#2C2C2E] text-white/40 cursor-not-allowed"
                 }`}
               >
                 {isGenerating ? (
                   <span className="inline-flex items-center justify-center gap-2">
                     <Loader2 className="w-5 h-5 animate-spin" />
                     Генерация…
                   </span>
                 ) : (
                   "Сгенерировать"
                 )}
               </button>
 
               <div className="h-4" />
            </div>
          </div>
        ) : null}
       </div>
     </div>
   );
 }

