'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronUp, Star } from 'lucide-react';
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
  
  // Get model name from config if modelId provided, otherwise use modelName prop
  const displayName = modelId 
    ? (getModelById(modelId)?.name || modelName)
    : modelName;
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onReferenceImageChange?.(base64);
      onReferenceFileChange?.(file);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveReference = () => {
    onReferenceImageChange?.(null);
    onReferenceFileChange?.(null);
  };

  const hasEnoughCredits = credits >= estimatedCost;
  const isDisabled = disabled || isGenerating;
  const canGenerate = prompt.trim().length > 0 && !isDisabled && hasEnoughCredits;

  const handleSubmit = () => {
    if (canGenerate) {
      onGenerate();
    } else {
      console.log('[ControlBarBottom] Generate blocked - reasons:', {
        noPrompt: prompt.trim().length === 0,
        disabled: isDisabled,
        notEnoughCredits: !hasEnoughCredits
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181B]/95 backdrop-blur-lg border-t border-[#27272A]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Main Control Bar - 2 ЛИНИИ КАК НА HIGGSFIELD */}
        <div className="flex flex-col gap-3">
          
          {/* ЛИНИЯ 1: Upload button + Large Textarea */}
          <div className="flex items-center gap-3">
            {supportsI2i && (
              <>
                {/* Upload button (плюсик слева) - для загрузки референса */}
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="reference-upload"
                    disabled={isGenerating}
                  />
                  <label
                    htmlFor="reference-upload"
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer
                      ${referenceImage 
                        ? 'border-[#CDFF00] bg-[#CDFF00]/10 hover:bg-[#CDFF00]/20' 
                        : 'border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C]'
                      }
                      ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title={referenceImage ? 'Референс загружен (клик для замены)' : 'Загрузить референс'}
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
                  
                  {/* Remove button when reference is loaded */}
                  {referenceImage && !isGenerating && (
                    <button
                      onClick={handleRemoveReference}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                      title="Удалить референс"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
     
                {/* Reference preview (if uploaded) */}
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

            {/* Large Prompt Textarea - ВСЕГДА АКТИВЕН */}
            <PromptInput
              value={prompt}
              onChange={onPromptChange}
              disabled={isGenerating}
              placeholder={referenceImage ? `${displayName}: Опишите что изменить...` : `${displayName}: Опишите сцену...`}
              onSubmit={handleSubmit}
            />
          </div>

          {/* ЛИНИЯ 2: Model + Controls + Generate */}
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={isGenerating}
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
              max={4}
              disabled={isGenerating}
            />

            {/* Spacer - push Generate to the right */}
            <div className="flex-1" />

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
              disabled={!canGenerate}
              title={
                !hasEnoughCredits ? `Недостаточно звёзд (нужно ${estimatedCost}⭐, есть ${credits}⭐)` : 
                disabled ? 'Войдите для генерации' : 
                prompt.trim().length === 0 ? 'Введите промпт' :
                ''
              }
              className={`
                flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm
                transition-all whitespace-nowrap min-w-[150px]
                ${canGenerate
                  ? 'bg-[#CDFF00] hover:bg-[#B8E600] text-black shadow-lg shadow-[#CDFF00]/20'
                  : 'bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate {estimatedCost}⭐</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Settings Collapse */}
        {showAdvanced && onNegativePromptChange && (
          <div className="mt-3 pt-3 border-t border-[#27272A]">
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
  );
}
