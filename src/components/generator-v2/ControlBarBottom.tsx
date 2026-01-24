'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronUp, Star, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { AspectRatioSelector } from './AspectRatioSelector';
import { QualitySelector } from './QualitySelector';
import { QuantityCounter } from './QuantityCounter';
import { PromptInput } from './PromptInput';
import { AdvancedSettingsCollapse } from './AdvancedSettingsCollapse';
import { getModelById } from '@/config/models';

interface ControlBarBottomProps {
  prompt: string;
  onPromptChange: (value: string) => void;
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
  onReferenceImageChange?: (value: string | null) => void;
  onReferenceFileChange?: (file: File | null) => void;
  supportsI2i?: boolean;
  // Advanced settings
  negativePrompt?: string;
  onNegativePromptChange?: (value: string) => void;
  seed?: number | null;
  onSeedChange?: (value: number | null) => void;
  steps?: number;
  onStepsChange?: (value: number) => void;
}

export function ControlBarBottom({
  prompt,
  onPromptChange,
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
  onReferenceImageChange,
  onReferenceFileChange,
  supportsI2i = true,
  negativePrompt,
  onNegativePromptChange,
  seed,
  onSeedChange,
  steps,
  onStepsChange,
}: ControlBarBottomProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  
  // Get model name from config if modelId provided, otherwise use modelName prop
  const displayName = modelId 
    ? (getModelById(modelId)?.name || modelName)
    : modelName;

  const isToolModel = modelId === 'topaz-image-upscale' || modelId === 'recraft-remove-background';
  const quantityMax = isToolModel ? 1 : 4;
  const uploadTitle = isToolModel ? 'Загрузить фото' : 'Загрузить референс';
  const uploadedTitle = isToolModel ? 'Фото загружено (клик для замены)' : 'Референс загружен (клик для замены)';
  const removeTitle = isToolModel ? 'Удалить фото' : 'Удалить референс';
  const promptPlaceholder = isToolModel
    ? (referenceImage
        ? `${displayName}: (опционально) комментарий...`
        : `${displayName}: сначала загрузите фото слева`)
    : (referenceImage
        ? `${displayName}: Опишите что изменить...`
        : `${displayName}: Опишите сцену...`);
  
  // Constants for validation
  const MAX_IMAGE_SIZE_MB = 10;
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  
  // Handle file upload with validation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение (PNG, JPG, WEBP)');
      return;
    }
    
    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Максимальный размер: ${MAX_IMAGE_SIZE_MB}МБ. Ваш файл: ${(file.size / 1024 / 1024).toFixed(1)}МБ`);
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      // Additional check for base64 size
      if (base64.length > MAX_IMAGE_SIZE_BYTES * 1.4) {
        toast.error('Изображение слишком большое. Попробуйте уменьшить размер.');
        return;
      }
      
      onReferenceImageChange?.(base64);
      onReferenceFileChange?.(file);
      toast.success('Изображение загружено');
    };
    reader.onerror = () => {
      toast.error('Не удалось прочитать файл');
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveReference = () => {
    onReferenceImageChange?.(null);
    onReferenceFileChange?.(null);
  };

  const hasEnoughCredits = credits >= estimatedCost;
  const isDisabled = disabled || isGenerating;
  const hasRequiredInput = isToolModel ? !!referenceImage : prompt.trim().length > 0;
  const canGenerate = isAuthenticated && hasRequiredInput && !isDisabled && hasEnoughCredits;
  const canSubmit = !isDisabled && (isAuthenticated ? canGenerate : true);

  const handleSubmit = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (canGenerate) onGenerate();
    else {
      if (isToolModel && !referenceImage) toast.error("Загрузите изображение");
      else if (!isToolModel && prompt.trim().length === 0) toast.error("Введите промпт");
      else if (!hasEnoughCredits) toast.error("Недостаточно звёзд");
    }
  };

  return (
    <>
    <div
      className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#18181B]/95 backdrop-blur-lg border border-[#27272A] rounded-2xl shadow-xl"
      style={{ width: "min(calc(100% - 1rem), 56rem)" }}
    >
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {/* === MOBILE: Simplified bar === */}
        <div className="sm:hidden flex flex-col gap-2">
          {/* Model info bar */}
          <button
            type="button"
            onClick={() => setMobileSettingsOpen(true)}
            className="flex items-center justify-between px-1 py-0.5 -mx-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#CDFF00]" />
              <span className="text-xs font-medium text-white/80">{displayName}</span>
              <span className="text-[10px] text-white/40">•</span>
              <span className="text-[10px] text-white/50">{aspectRatio}</span>
              <span className="text-[10px] text-white/50">•</span>
              <span className="text-[10px] text-white/50">{quality}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[#CDFF00]" />
              <span className="text-xs font-semibold text-[#CDFF00]">{estimatedCost}</span>
            </div>
          </button>
          
          {/* Controls row */}
          <div className="flex items-end gap-3">
            {/* Prompt input */}
            <div className="flex-1 min-w-0">
              <PromptInput
                value={prompt}
                onChange={onPromptChange}
                disabled={isGenerating}
                placeholder={isToolModel ? "Комментарий (опционально)..." : "Опишите изображение..."}
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
              title={!canSubmit ? "Введите промпт" : `Генерация за ${estimatedCost} ⭐`}
              className={`
                flex items-center justify-center w-14 h-14 rounded-full font-bold transition-all shrink-0
                ${canSubmit
                  ? 'bg-[#CDFF00] text-black shadow-lg shadow-[#CDFF00]/30 hover:bg-[#B8E600]'
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

        {/* === DESKTOP: Full controls === */}
        <div className="hidden sm:flex flex-col gap-3">
          {/* Line 1: Upload + Prompt */}
          <div className="flex items-end gap-3">
            {supportsI2i && (
              <>
                {/* Upload button */}
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="reference-upload-desktop"
                    disabled={isGenerating}
                  />
                  <label
                    htmlFor="reference-upload-desktop"
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer
                      ${referenceImage 
                        ? 'border-[#CDFF00] bg-[#CDFF00]/10 hover:bg-[#CDFF00]/20' 
                        : 'border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C]'
                      }
                      ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title={referenceImage ? uploadedTitle : uploadTitle}
                  >
                    {referenceImage ? (
                      <svg className="w-5 h-5 text-[#CDFF00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[#A1A1AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </label>
                  
                  {referenceImage && !isGenerating && (
                    <button
                      onClick={handleRemoveReference}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                      title={removeTitle}
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
     
                {referenceImage && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#CDFF00] flex-shrink-0">
                    <img 
                      src={referenceImage} 
                      alt="Reference" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </>
            )}

            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              disabled={isGenerating}
              placeholder={promptPlaceholder}
              onSubmit={handleSubmit}
            />
          </div>

          {/* Line 2: Model + Controls + Generate */}
          <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar pb-1">
            {/* Model Badge (слева) */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg">
              <Sparkles className="w-4 h-4 text-[#CDFF00]" />
              <span className="text-sm font-medium text-white whitespace-nowrap">
                {displayName}
              </span>
            </div>

            {/* Aspect Ratio - ВСЕГДА АКТИВЕН */}
            <AspectRatioSelector
              value={aspectRatio}
              onChange={onAspectRatioChange}
              disabled={isGenerating || isToolModel}
              options={aspectRatioOptions}
            />
            
            {/* Quality - ВСЕГДА АКТИВЕН */}
            <QualitySelector
              value={quality}
              onChange={onQualityChange}
              disabled={isGenerating}
              options={qualityOptions}
            />

            {/* Output format (photo only) */}
            {onOutputFormatChange && outputFormatOptions.length > 0 && (
              <div className="flex items-center gap-1 px-1 py-1 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg">
                {outputFormatOptions.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => onOutputFormatChange(fmt)}
                    disabled={isGenerating}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                      ${fmt === outputFormat
                        ? 'bg-[#CDFF00] text-black'
                        : 'bg-transparent text-[#A1A1AA] hover:bg-[#2A2A2C] hover:text-white'
                      }
                      ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                    title={`Формат: ${fmt.toUpperCase()}`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            
            {/* Quantity Counter - ВСЕГДА АКТИВЕН */}
            <QuantityCounter
              value={quantity}
              onChange={onQuantityChange}
              min={1}
              max={quantityMax}
              disabled={isGenerating || isToolModel}
            />

            {/* Spacer - push desktop Generate to the right */}
            <div className="hidden sm:block flex-1" />

            {/* Advanced Toggle - ВСЕГДА АКТИВЕН */}
            {onNegativePromptChange && (
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                disabled={isGenerating}
                className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Дополнительно"
              >
                <ChevronUp className={`w-4 h-4 text-[#A1A1AA] transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Generate Button со стоимостью (справа) */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              title={
                !isAuthenticated
                  ? "Войти через Telegram"
                  : !hasEnoughCredits
                    ? `Недостаточно звёзд (нужно ${estimatedCost}⭐, есть ${credits}⭐)`
                    : isToolModel && !referenceImage
                      ? "Загрузите изображение"
                      : !isToolModel && prompt.trim().length === 0
                        ? "Введите промпт"
                        : ""
              }
              className={`
                hidden sm:flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm
                transition-all whitespace-nowrap min-w-[150px]
                ${canSubmit
                  ? 'bg-[#CDFF00] hover:bg-[#B8E600] text-black shadow-lg shadow-[#CDFF00]/20'
                  : 'bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Генерация...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isAuthenticated ? `Создать ${estimatedCost}⭐` : "Войти"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Settings Collapse - Desktop only */}
        {showAdvanced && onNegativePromptChange && (
          <div className="hidden sm:block mt-3 pt-3 border-t border-[#27272A]">
            <AdvancedSettingsCollapse
              negativePrompt={negativePrompt || ''}
              onNegativePromptChange={onNegativePromptChange}
              seed={seed}
              onSeedChange={onSeedChange}
              steps={steps}
              onStepsChange={onStepsChange}
              disabled={isGenerating}
            />
          </div>
        )}
      </div>
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
                <Sparkles className="w-4 h-4 text-[#CDFF00]" />
                <span className="text-base font-medium text-white">{displayName}</span>
              </div>
            </div>

            {/* Aspect Ratio */}
            {!isToolModel && (
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
                          ? 'bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]'
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
            {qualityOptions && qualityOptions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider">Качество</div>
                <div className="flex gap-2 flex-wrap">
                  {qualityOptions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onQualityChange(q)}
                      disabled={isGenerating}
                      className={`
                        h-10 px-4 rounded-xl border text-sm font-semibold transition-colors
                        ${quality === q
                          ? 'bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]'
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
                          ? 'bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]'
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
                    disabled={isGenerating || quantity <= 1}
                    className="w-10 h-10 rounded-xl border border-[#3A3A3C] bg-[#1E1E20] text-white font-bold hover:bg-[#2A2A2C] disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-white w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => onQuantityChange(Math.min(quantityMax, quantity + 1))}
                    disabled={isGenerating || quantity >= quantityMax}
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
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="reference-upload-mobile"
                    disabled={isGenerating}
                  />
                  <label
                    htmlFor="reference-upload-mobile"
                    className={`
                      flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                      ${referenceImage 
                        ? 'border-[#CDFF00] bg-[#CDFF00]/10' 
                        : 'border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C]'
                      }
                      ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {referenceImage ? (
                      <img 
                        src={referenceImage} 
                        alt="Reference" 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-[#A1A1AA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </label>
                  {referenceImage && (
                    <button
                      type="button"
                      onClick={handleRemoveReference}
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20"
                    >
                      Удалить
                    </button>
                  )}
                </div>
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
                      className="w-full min-h-[60px] px-3 py-2 rounded-xl bg-[#1E1E20] border border-[#3A3A3C] text-sm text-white placeholder:text-[#6B6B6E] focus:outline-none focus:border-[#CDFF00] resize-none"
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
                        className="w-full h-10 px-3 rounded-xl bg-[#1E1E20] border border-[#3A3A3C] text-sm text-white placeholder:text-[#6B6B6E] focus:outline-none focus:border-[#CDFF00]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cost summary */}
            <div className="pt-4 border-t border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#A1A1AA]">Стоимость</div>
                <div className="flex items-center gap-2 text-lg font-bold text-[#CDFF00]">
                  <Star className="w-5 h-5" />
                  {estimatedCost}
                </div>
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(false)}
              className="w-full h-14 rounded-2xl bg-[#CDFF00] text-black font-bold text-base hover:bg-[#B8E600] transition-colors"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
