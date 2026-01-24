'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Sparkles, Loader2, Settings, ImagePlus, X, Star } from 'lucide-react';
import { toast } from 'sonner';

interface HiggsPromptBarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  credits: number;
  estimatedCost: number;
  aspectRatio: string;
  quality: string;
  quantity: number;
  onSettingsOpen: () => void;
  referenceImage: string | null;
  onReferenceImageChange: (value: string | null) => void;
  onReferenceFileChange: (file: File | null) => void;
}

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export function HiggsPromptBar({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  disabled = false,
  credits,
  estimatedCost,
  aspectRatio,
  quality,
  quantity,
  onSettingsOpen,
  referenceImage,
  onReferenceImageChange,
  onReferenceFileChange,
}: HiggsPromptBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasEnoughCredits = credits >= estimatedCost;
  const canGenerate = !disabled && !isGenerating && prompt.trim().length > 0 && hasEnoughCredits;

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Максимум ${MAX_IMAGE_SIZE_MB}МБ`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onReferenceImageChange(base64);
      onReferenceFileChange(file);
      toast.success('Изображение загружено');
    };
    reader.onerror = () => toast.error('Ошибка загрузки');
    reader.readAsDataURL(file);
  };

  // Remove reference
  const handleRemoveReference = () => {
    onReferenceImageChange(null);
    onReferenceFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle submit
  const handleSubmit = () => {
    if (canGenerate) {
      onGenerate();
    } else if (!hasEnoughCredits) {
      toast.error('Недостаточно звёзд');
    } else if (!prompt.trim()) {
      toast.error('Введите описание');
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="higgs-prompt-bar">
      <div className="higgs-prompt-bar-inner">
        {/* Top row: Model info + Settings */}
        <div className="higgs-prompt-bar-header">
          <div className="higgs-prompt-bar-model">
            <Sparkles className="higgs-prompt-bar-model-icon" />
            <span className="higgs-prompt-bar-model-name">Nano Banana Pro</span>
            <span className="higgs-prompt-bar-divider">•</span>
            <span className="higgs-prompt-bar-setting">{aspectRatio}</span>
            <span className="higgs-prompt-bar-divider">•</span>
            <span className="higgs-prompt-bar-setting">{quality}</span>
            {quantity > 1 && (
              <>
                <span className="higgs-prompt-bar-divider">•</span>
                <span className="higgs-prompt-bar-setting">×{quantity}</span>
              </>
            )}
          </div>
          <div className="higgs-prompt-bar-cost">
            <Star className="higgs-prompt-bar-cost-icon" />
            <span>{estimatedCost}</span>
          </div>
        </div>

        {/* Bottom row: Upload + Prompt + Settings + Generate */}
        <div className="higgs-prompt-bar-main">
          {/* Upload button */}
          <div className="higgs-prompt-bar-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isGenerating}
            />
            {referenceImage ? (
              <div className="higgs-prompt-bar-upload-preview">
                <Image src={referenceImage} alt="Reference" fill className="object-cover" unoptimized />
                <button
                  onClick={handleRemoveReference}
                  className="higgs-prompt-bar-upload-remove"
                  disabled={isGenerating}
                >
                  <X />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="higgs-prompt-bar-upload-btn"
                disabled={isGenerating}
                title="Загрузить референс"
              >
                <ImagePlus />
              </button>
            )}
          </div>

          {/* Prompt input */}
          <div className="higgs-prompt-bar-input-wrap">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                referenceImage
                  ? 'Опишите что изменить...'
                  : 'Опишите сцену которую хотите создать...'
              }
              disabled={isGenerating || disabled}
              rows={1}
              className="higgs-prompt-bar-input"
            />
          </div>

          {/* Settings button */}
          <button
            onClick={onSettingsOpen}
            className="higgs-prompt-bar-settings-btn"
            disabled={isGenerating}
            title="Настройки"
          >
            <Settings />
          </button>

          {/* Generate button */}
          <button
            onClick={handleSubmit}
            disabled={!canGenerate && !disabled}
            className={`higgs-prompt-bar-generate-btn ${canGenerate ? 'active' : ''}`}
            title={
              disabled
                ? 'Войдите для генерации'
                : !hasEnoughCredits
                ? `Нужно ${estimatedCost}⭐`
                : 'Ctrl+Enter для генерации'
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                <span className="higgs-prompt-bar-generate-text">Генерация...</span>
              </>
            ) : (
              <>
                <Sparkles />
                <span className="higgs-prompt-bar-generate-text">
                  {disabled ? 'Войти' : `Создать`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
