/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { Sparkles, Loader2, Star, Settings, Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PromptInput } from './PromptInput';
import { WanPromptPanelDesktop } from './WanPromptPanelDesktop';
import { getModelById } from '@/config/models';
import { uploadReferenceFiles } from "@/lib/supabase/upload-reference";

interface ControlBarBottomProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onModelChange?: (modelId: string) => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  quality: string;
  onQualityChange: (value: string) => void;
  outputFormat?: "png" | "jpg" | "webp";
  onOutputFormatChange?: (value: "png" | "jpg" | "webp") => void;
  outputFormatOptions?: ReadonlyArray<"png" | "jpg" | "webp">;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  credits?: number;
  estimatedCost?: number;
  // Model-specific options
  modelName?: string; // e.g., 'Nano Banana Pro', 'Z-Image' (fallback if modelId not provided)
  modelId?: string; // e.g., 'nano-banana-pro', 'z-image' (preferred - auto-fetches name from config)
  qualityOptions?: string[]; // e.g., ['Turbo', 'Balanced', 'Quality'] or ['1K', '2K', '4K']
  aspectRatioOptions?: string[]; // e.g., ['1:1', '16:9', '9:16', '4:3']
  // Reference image
  referenceImage?: string | null;
  /** Multiple reference images (preferred for models like Nano Banana Pro). */
  referenceImages?: string[];
  onReferenceImageChange?: (value: string | null) => void;
  onReferenceImagesChange?: (value: string[]) => void;
  onReferenceFileChange?: (file: File | null) => void;
  supportsI2i?: boolean;
  requiresReferenceImage?: boolean;
  requiresPrompt?: boolean;
  // Advanced settings
  negativePrompt?: string;
  onNegativePromptChange?: (value: string) => void;
  seed?: number | null;
  onSeedChange?: (value: number | null) => void;
  steps?: number;
  onStepsChange?: (value: number) => void;
  /** Gallery zoom (0.5–1.5). When set, show +/- controls in the bar. */
  showGalleryZoom?: boolean;
  galleryZoom?: number;
  onGalleryZoomChange?: (zoom: number) => void;
  quantityMaxOverride?: number;
}

type PhotoModelMeta = {
  maxInputImages?: number;
  inputImageFormats?: Array<'jpeg' | 'png' | 'webp'>;
  maxInputImageSizeMb?: number;
};

const ControlBarBottomComponent = ({
  prompt,
  onPromptChange,
  onModelChange,
  aspectRatio,
  onAspectRatioChange,
  quality,
  onQualityChange,
  outputFormat = "png",
  onOutputFormatChange,
  outputFormatOptions = ["png", "jpg"],
  quantity,
  onQuantityChange,
  onGenerate,
  isGenerating,
  disabled = false,
  isAuthenticated = true,
  onRequireAuth,
  credits = 0,
  estimatedCost = 0,
  modelName = 'Generator',
  modelId,
  qualityOptions,
  aspectRatioOptions,
  referenceImage,
  referenceImages,
  onReferenceImageChange,
  onReferenceImagesChange,
  onReferenceFileChange,
  supportsI2i = true,
  requiresReferenceImage,
  requiresPrompt,
  negativePrompt,
  onNegativePromptChange,
  seed,
  onSeedChange,
  steps,
  onStepsChange,
  showGalleryZoom = false,
  galleryZoom = 1,
  onGalleryZoomChange,
  quantityMaxOverride,
}: ControlBarBottomProps) => {
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [isAddingRefs, setIsAddingRefs] = useState(false);
  const [pendingRefPreviews, setPendingRefPreviews] = useState<string[]>([]);

  // Get model name from config if modelId provided, otherwise use modelName prop
  const displayName = useMemo(() =>
    modelId ? (getModelById(modelId)?.name || modelName) : modelName,
    [modelId, modelName]
  );

  const isToolModel = useMemo(() =>
    modelId === 'topaz-image-upscale' || modelId === 'recraft-remove-background',
    [modelId]
  );

  const isGrokImagine = useMemo(() =>
    modelId === "grok-imagine",
    [modelId]
  );

  // Most photo models in our UI allow up to 4 parallel generations per click.
  // Grok Imagine returns 6 images per run on upstream (fixed output count).
  const quantityMax = useMemo(() =>
    typeof quantityMaxOverride === 'number'
      ? Math.max(1, quantityMaxOverride)
      : (isToolModel ? 1 : isGrokImagine ? 6 : 4),
    [quantityMaxOverride, isToolModel, isGrokImagine]
  );

  const uploadTitle = useMemo(() =>
    isToolModel ? 'Загрузить фото' : 'Загрузить референс',
    [isToolModel]
  );

  const uploadedTitle = useMemo(() =>
    isToolModel ? 'Фото загружено (клик для замены)' : 'Референс загружен (клик для замены)',
    [isToolModel]
  );

  const removeTitle = useMemo(() =>
    isToolModel ? 'Удалить фото' : 'Удалить референс',
    [isToolModel]
  );

  const model = useMemo(() =>
    modelId ? getModelById(modelId) : undefined,
    [modelId]
  );

  const photoModel = useMemo<PhotoModelMeta | null>(() =>
    model && model.type === "photo" ? (model as PhotoModelMeta) : null,
    [model]
  );

  const maxReferenceImages = useMemo(() =>
    isToolModel ? 1 : Math.max(1, Number(photoModel?.maxInputImages ?? 1)),
    [isToolModel, photoModel]
  );

  const referenceList: string[] = useMemo(() =>
    Array.isArray(referenceImages)
      ? referenceImages.filter((x) => typeof x === "string" && x.trim().length > 0)
      : (referenceImage ? [referenceImage] : []),
    [referenceImages, referenceImage]
  );

  const hasAnyReference = useMemo(() =>
    referenceList.length > 0,
    [referenceList]
  );

  const hasAnyReferenceVisual = useMemo(() =>
    hasAnyReference || pendingRefPreviews.length > 0,
    [hasAnyReference, pendingRefPreviews.length]
  );

  const needsPrompt = useMemo(() =>
    typeof requiresPrompt === 'boolean' ? requiresPrompt : !isToolModel,
    [requiresPrompt, isToolModel]
  );

  const needsReference = useMemo(() =>
    typeof requiresReferenceImage === 'boolean' ? requiresReferenceImage : isToolModel,
    [requiresReferenceImage, isToolModel]
  );

  const promptPlaceholder = useMemo(() => {
    const base = needsReference
      ? (hasAnyReferenceVisual ? "Опишите что изменить..." : "сначала загрузите фото слева")
      : (hasAnyReferenceVisual ? "Опишите что изменить..." : "Опишите сцену...");
    return `Промпт: ${base}`;
  }, [needsReference, hasAnyReferenceVisual]);

  const allowedInputFormats: Array<'jpeg' | 'png' | 'webp'> | null = useMemo(() =>
    photoModel?.inputImageFormats && Array.isArray(photoModel.inputImageFormats)
      ? photoModel.inputImageFormats
      : null,
    [photoModel]
  );

  const allowedMimeTypes: string[] | null = useMemo(() =>
    allowedInputFormats
      ? allowedInputFormats
          .map((f) => (f === "jpeg" ? "image/jpeg" : f === "png" ? "image/png" : f === "webp" ? "image/webp" : undefined))
          .filter((x): x is Exclude<typeof x, undefined> => x !== undefined)
      : null,
    [allowedInputFormats]
  );

  const maxImageSizeMb = useMemo(() =>
    Number(photoModel?.maxInputImageSizeMb ?? 10),
    [photoModel]
  );

  const MAX_IMAGE_SIZE_BYTES = useMemo(() =>
    Math.max(1, maxImageSizeMb) * 1024 * 1024,
    [maxImageSizeMb]
  );

  const acceptAttr = useMemo(() =>
    allowedMimeTypes?.length ? allowedMimeTypes.join(",") : "image/*",
    [allowedMimeTypes]
  );

  const updateReferences = useCallback((next: string[], files?: File[]) => {
    if (onReferenceImagesChange) {
      onReferenceImagesChange(next);
      return;
    }
    // Backward-compatible single-ref mode
    const first = next[0] || null;
    onReferenceImageChange?.(first);
    if (files && files[0]) onReferenceFileChange?.(files[0]);
    else if (!first) onReferenceFileChange?.(null);
  }, [onReferenceImagesChange, onReferenceImageChange, onReferenceFileChange]);

  const readFileAsDataUrl = useCallback((file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    }), []);
  
  // Handle file upload with validation
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // allow selecting the same file again
    e.target.value = "";
    if (!files.length) return;

    const current = referenceList;
    const remaining = Math.max(0, maxReferenceImages - current.length);
    if (remaining <= 0) {
      toast.error(`Можно добавить максимум ${maxReferenceImages} изображений`);
      return;
    }

    const picked = (isToolModel ? files.slice(0, 1) : files.slice(0, remaining));
    if (!isToolModel && files.length > remaining) {
      toast(`Добавлены первые ${remaining} из ${files.length} (лимит ${maxReferenceImages})`, { duration: 3500 });
    }

    // Validate files
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        toast.error("Выберите изображение");
        return;
      }
      if (allowedMimeTypes && !allowedMimeTypes.includes(String(file.type || "").toLowerCase())) {
        const formatsLabel = allowedInputFormats ? allowedInputFormats.map((f) => f.toUpperCase()).join(", ") : "JPEG, PNG, WEBP";
        toast.error(`Неподдерживаемый формат. Разрешено: ${formatsLabel}`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`Максимальный размер: ${maxImageSizeMb}МБ. Ваш файл: ${(file.size / 1024 / 1024).toFixed(1)}МБ`);
        return;
      }
    }

    try {
      const previews = picked.map((f) => URL.createObjectURL(f));
      setPendingRefPreviews(previews);
      setIsAddingRefs(true);

      // Prefer uploading to storage to avoid sending large base64 in /api/generate/photo.
      let uploadedUrls: string[] = [];
      try {
        uploadedUrls = await uploadReferenceFiles(picked, { prefix: "ref" });
      } catch {
        // Silent fallback to base64 (common when Supabase client isn't ready in the browser).
      }

      if (uploadedUrls.length === picked.length) {
        const next = isToolModel ? [uploadedUrls[0]!] : [...current, ...uploadedUrls];
        updateReferences(next, picked);
        toast.success(isToolModel ? "Изображение загружено" : `Добавлено: ${uploadedUrls.length}`);
        return;
      }

      const encoded = await Promise.all(picked.map((f) => readFileAsDataUrl(f)));
      for (const b64 of encoded) {
        if (b64.length > MAX_IMAGE_SIZE_BYTES * 1.4) {
          toast.error("Изображение слишком большое. Попробуйте уменьшить размер.");
          return;
        }
      }
      const next = isToolModel ? [encoded[0]!] : [...current, ...encoded];
      updateReferences(next, picked);
      toast.success(isToolModel ? "Изображение загружено" : `Добавлено: ${encoded.length}`);
    } catch {
      toast.error("Не удалось прочитать файл");
    } finally {
      setIsAddingRefs(false);
      setPendingRefPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
    }
  }, [referenceList, maxReferenceImages, isToolModel, allowedMimeTypes, allowedInputFormats, MAX_IMAGE_SIZE_BYTES, maxImageSizeMb, readFileAsDataUrl, updateReferences]);
  
  const handleRemoveReference = useCallback(() => {
    updateReferences([]);
  }, [updateReferences]);

  const handleRemoveReferenceAt = useCallback((idx: number) => {
    const next = referenceList.filter((_, i) => i !== idx);
    updateReferences(next);
  }, [referenceList, updateReferences]);

  const hasEnoughCredits = useMemo(() =>
    credits >= estimatedCost,
    [credits, estimatedCost]
  );

  const showAspectRatio = useMemo(() =>
    !isToolModel && (aspectRatioOptions?.length ?? 0) > 0,
    [isToolModel, aspectRatioOptions]
  );

  const showQuality = useMemo(() =>
    (qualityOptions?.length ?? 0) > 0,
    [qualityOptions]
  );

  const isDisabled = useMemo(() =>
    disabled || isGenerating || isAddingRefs,
    [disabled, isGenerating, isAddingRefs]
  );

  const hasRequiredInput = useMemo(() => {
    if (needsPrompt && prompt.trim().length === 0) return false;
    if (needsReference && !hasAnyReference) return false;
    return true;
  }, [needsPrompt, needsReference, prompt, hasAnyReference]);

  const canGenerate = useMemo(() =>
    isAuthenticated && hasRequiredInput && !isDisabled && hasEnoughCredits,
    [isAuthenticated, hasRequiredInput, isDisabled, hasEnoughCredits]
  );

  const canSubmit = useMemo(() =>
    !isDisabled && (isAuthenticated ? canGenerate : true),
    [isDisabled, isAuthenticated, canGenerate]
  );

  const handleSubmit = useCallback(() => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (canGenerate) onGenerate();
    else {
      if (needsReference && !hasAnyReference) {
        if (pendingRefPreviews.length > 0) toast.error("Референс загружается...");
        else toast.error("Загрузите изображение");
      }
      else if (needsPrompt && prompt.trim().length === 0) toast.error("Введите промпт");
      else if (!hasEnoughCredits) toast.error("Недостаточно звёзд");
    }
  }, [isAuthenticated, canGenerate, onRequireAuth, onGenerate, needsReference, hasAnyReference, needsPrompt, prompt, hasEnoughCredits, pendingRefPreviews.length]);

  return (
    <>
    <div
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 sm:hidden bg-[#18181B]/95 backdrop-blur-lg border border-[#27272A] rounded-2xl shadow-xl"
      style={{ width: "min(calc(100% - 1rem), 56rem)" }}
    >
      <div className="px-3 py-3">
        <div className="flex flex-col gap-2">
          {/* Model info bar */}
          <button
            type="button"
            onClick={() => setMobileSettingsOpen(true)}
            className="flex items-center justify-between px-1 py-0.5 -mx-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="text-xs font-medium text-white/80">{displayName}</span>
              {showAspectRatio && (
                <>
                  <span className="text-[10px] text-white/40">•</span>
                  <span className="text-[10px] text-white/50">{aspectRatio}</span>
                </>
              )}
              {showQuality && (
                <>
                  <span className="text-[10px] text-white/50">•</span>
                  <span className="text-[10px] text-white/50">{quality}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[#f59e0b]" />
              <span className="text-xs font-semibold text-[#f59e0b]">{estimatedCost}</span>
            </div>
          </button>
          
          {/* Controls row */}
          <div className="flex items-end gap-3">
            {/* Mobile gallery zoom */}
            {showGalleryZoom && onGalleryZoomChange && (
              <div className="flex items-center gap-0.5 py-1.5 px-1.5 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onGalleryZoomChange(Math.max(0.5, (galleryZoom ?? 1) - 0.1))}
                  disabled={(galleryZoom ?? 1) <= 0.5}
                  className="flex items-center justify-center w-7 h-7 rounded text-[#A1A1AA] hover:bg-[#2A2A2C] hover:text-white disabled:opacity-40"
                  title="Уменьшить"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-medium text-white/80 min-w-[2rem] text-center">
                  {Math.round((galleryZoom ?? 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => onGalleryZoomChange(Math.min(1.5, (galleryZoom ?? 1) + 0.1))}
                  disabled={(galleryZoom ?? 1) >= 1.5}
                  className="flex items-center justify-center w-7 h-7 rounded text-[#A1A1AA] hover:bg-[#2A2A2C] hover:text-white disabled:opacity-40"
                  title="Увеличить"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Prompt input */}
            <div className="flex-1 min-w-0">
            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              disabled={isGenerating}
              placeholder={promptPlaceholder}
              onSubmit={handleSubmit}
            />
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              disabled={isGenerating}
              className={`
                flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E1E20] border border-[#3A3A3C] hover:bg-[#2A2A2C] transition-colors shrink-0
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Настройки"
            >
              <Settings className="w-5 h-5 text-[#A1A1AA]" />
            </button>

            {/* Big circular Generate button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              title={!canSubmit ? "Введите промпт" : `Списать ${estimatedCost}⭐`}
              className={`
                flex items-center justify-center w-14 h-14 rounded-full font-bold transition-all shrink-0
                ${canSubmit
                  ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/30 hover:bg-[#fbbf24]'
                  : 'bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Star className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop prompt panel is rendered separately for md+ */}
      </div>
    </div>

    {/* === DESKTOP: Wan-like expandable panel === */}
    <div className="hidden md:block">
      <WanPromptPanelDesktop
        prompt={prompt}
        onPromptChange={onPromptChange}
        promptPlaceholder={promptPlaceholder}
        onSubmit={handleSubmit}
        isGenerating={isGenerating || isAddingRefs}
        canSubmit={canSubmit}
        credits={credits}
        estimatedCost={estimatedCost}
        hasEnoughCredits={hasEnoughCredits}
        needsReference={needsReference}
        hasAnyReference={hasAnyReference}
        needsPrompt={needsPrompt}
        aspectRatio={aspectRatio}
        onAspectRatioChange={onAspectRatioChange}
        aspectRatioOptions={aspectRatioOptions}
        displayName={displayName}
        modelId={modelId}
        onModelChange={onModelChange}
        quality={quality}
        onQualityChange={onQualityChange}
        qualityOptions={qualityOptions}
        outputFormat={outputFormat}
        onOutputFormatChange={onOutputFormatChange}
        outputFormatOptions={outputFormatOptions}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
        quantityMax={quantityMax}
        isToolModel={isToolModel}
        isGrokImagine={isGrokImagine}
        showGalleryZoom={showGalleryZoom}
        galleryZoom={galleryZoom}
        onGalleryZoomChange={onGalleryZoomChange}
        supportsI2i={supportsI2i}
        acceptAttr={acceptAttr}
        maxReferenceImages={maxReferenceImages}
        referenceCount={referenceList.length}
        hasAnyReferenceVisual={hasAnyReferenceVisual}
        isAddingRefs={isAddingRefs}
        pendingRefPreviews={pendingRefPreviews}
        referenceList={referenceList}
        onPickFiles={handleFileUpload}
        onRemoveAllRefs={handleRemoveReference}
        negativePrompt={negativePrompt}
        onNegativePromptChange={onNegativePromptChange}
        seed={seed}
        onSeedChange={onSeedChange}
        steps={steps}
        onStepsChange={onStepsChange}
      />
    </div>

    {/* === MOBILE SETTINGS SHEET === */}
    {mobileSettingsOpen && (
      <div className="fixed inset-0 z-[60] sm:hidden">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileSettingsOpen(false)}
        />

        {/* Sheet */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] border-t border-[#27272A] rounded-t-3xl max-h-[85vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-[#27272A]">
            <h3 className="text-lg font-semibold text-white">Настройки</h3>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-[#A1A1AA]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-5">
            {/* Model badge */}
            <div className="space-y-2">
              <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Модель</div>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1E1E20] border border-[#3A3A3C] rounded-2xl">
                <Sparkles className="w-4 h-4 text-[#f59e0b]" />
                <span className="text-base font-medium text-white">{displayName}</span>
              </div>
            </div>

            {/* Aspect Ratio */}
            {showAspectRatio && (
              <div className="space-y-2">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Пропорции</div>
                <div className="flex gap-2 flex-wrap">
                  {(aspectRatioOptions || ['1:1', '16:9', '9:16', '4:3']).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => onAspectRatioChange(ar)}
                      disabled={isGenerating}
                      className={`
                        h-10 px-4 rounded-xl border text-sm font-semibold transition-colors
                        ${aspectRatio === ar
                          ? 'bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]'
                          : 'bg-[#1E1E20] border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#2A2A2C]'
                        }
                      `}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quality */}
            {showQuality && (
              <div className="space-y-2">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Качество</div>
                <div className="flex gap-2 flex-wrap">
                  {(qualityOptions ?? []).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onQualityChange(q)}
                      disabled={isGenerating}
                      className={`
                        h-10 px-4 rounded-xl border text-sm font-semibold transition-colors
                        ${quality === q
                          ? 'bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]'
                          : 'bg-[#1E1E20] border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#2A2A2C]'
                        }
                      `}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Output Format */}
            {onOutputFormatChange && outputFormatOptions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Формат</div>
                <div className="flex gap-2">
                  {outputFormatOptions.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => onOutputFormatChange(fmt)}
                      disabled={isGenerating}
                      className={`
                        h-10 px-4 rounded-xl border text-sm font-semibold transition-colors
                        ${outputFormat === fmt
                          ? 'bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]'
                          : 'bg-[#1E1E20] border-[#3A3A3C] text-[#A1A1AA] hover:bg-[#2A2A2C]'
                        }
                      `}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            {!isToolModel && (
              <div className="space-y-2">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Количество</div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={isGenerating || isGrokImagine || quantity <= 1 || quantityMax <= 1}
                    className="w-10 h-10 rounded-xl border border-[#3A3A3C] bg-[#1E1E20] text-white font-bold hover:bg-[#2A2A2C] disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-white w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.min(quantityMax, quantity + 1))}
                    disabled={isGenerating || isGrokImagine || quantity >= quantityMax || quantityMax <= 1}
                    className="w-10 h-10 rounded-xl border border-[#3A3A3C] bg-[#1E1E20] text-white font-bold hover:bg-[#2A2A2C] disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Reference Image */}
            {supportsI2i && (
              <div className="space-y-3">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">
                  {isToolModel ? 'Изображение' : 'Референс'}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept={acceptAttr}
                    multiple={!isToolModel && maxReferenceImages > 1}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="reference-upload-mobile"
                    disabled={isGenerating || isAddingRefs}
                  />
                  <label
                    htmlFor="reference-upload-mobile"
                    className={`
                      flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                      ${hasAnyReferenceVisual 
                        ? 'border-[#f59e0b] bg-[#f59e0b]/10' 
                        : 'border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C]'
                      }
                      ${(isGenerating || isAddingRefs) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                    `}
                  >
                    {hasAnyReference ? (
                      <img src={referenceList[0]} alt="Reference" className="w-full h-full object-cover rounded-xl" />
                    ) : pendingRefPreviews.length > 0 ? (
                      <div className="relative w-full h-full">
                        <img src={pendingRefPreviews[0]} alt="Reference (pending)" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute inset-0 rounded-xl bg-black/35 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white/90" />
                        </div>
                      </div>
                    ) : (
                      <svg className="w-8 h-8 text-[#A1A1AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </label>
                  {hasAnyReference && (
                    <button
                      type="button"
                      onClick={handleRemoveReference}
                      disabled={isGenerating || isAddingRefs}
                      className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                {/* Thumbnails for multi-ref */}
                {!isToolModel && maxReferenceImages > 1 && (hasAnyReferenceVisual) && (
                  <div className="flex gap-2 flex-wrap">
                    {pendingRefPreviews.map((src, idx) => (
                      <div key={`pending-${idx}`} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 opacity-80">
                        <img src={src} alt={`Pending Ref ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-white/90" />
                        </div>
                      </div>
                    ))}
                    {referenceList.map((src, idx) => (
                      <div key={`${idx}`} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10">
                        <img src={src} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                        {!isGenerating && !isAddingRefs && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReferenceAt(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"
                            title="Удалить"
                          >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="self-center text-xs text-white/40">
                      {(referenceList.length + pendingRefPreviews.length)}/{maxReferenceImages}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings */}
            {onNegativePromptChange && (
              <div className="space-y-3 pt-4 border-t border-[#27272A]">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Дополнительно</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-[#A1A1AA] mb-1 block">Негативный промпт</label>
                    <textarea
                      value={negativePrompt || ''}
                      onChange={(e) => onNegativePromptChange(e.target.value)}
                      disabled={isGenerating}
                      placeholder="Что исключить..."
                      className="w-full min-h-[60px] px-3 py-2 rounded-xl bg-[#1E1E20] border border-[#3A3A3C] text-sm text-white placeholder:text-[#6B6B6E] focus:outline-none focus:border-[#f59e0b] resize-none"
                    />
                  </div>
                  {onSeedChange && (
                    <div>
                      <label className="text-sm text-[#A1A1AA] mb-1 block">Seed</label>
                      <input
                        type="number"
                        value={seed ?? ''}
                        onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
                        disabled={isGenerating}
                        placeholder="Случайный"
                        className="w-full h-10 px-3 rounded-xl bg-[#1E1E20] border border-[#3A3A3C] text-sm text-white placeholder:text-[#6B6B6E] focus:outline-none focus:border-[#f59e0b]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cost summary */}
            <div className="pt-4 border-t border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#A1A1AA]">Списать</div>
                <div className="flex items-center gap-2 text-lg font-bold text-[#f59e0b]">
                  <Star className="w-5 h-5" />
                  {estimatedCost}
                </div>
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(false)}
              className="w-full h-14 rounded-2xl bg-[#f59e0b] text-black font-bold text-base hover:bg-[#fbbf24] transition-colors"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export const ControlBarBottom = memo(ControlBarBottomComponent);
