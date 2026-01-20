'use client';

import { memo, useState } from 'react';
import { Sparkles, Download, Maximize2, Wand2, Layers } from 'lucide-react';
import { GenerationResult, GeneratorMode } from './GeneratorV2';
import { ImageUploader } from './ImageUploader';
import { BatchImageUploader, type UploadedImage } from './BatchImageUploader';
import { HistoryImagePicker } from './HistoryImagePicker';
import { toast } from 'sonner';

interface CanvasProps {
  result: GenerationResult | null;
  isGenerating: boolean;
  mode: GeneratorMode;
  onExampleClick?: (prompt: string) => void;
  referenceImage?: string | null;
  onReferenceImageChange?: (image: string | null) => void;
  batchMode?: boolean;
  batchImages?: UploadedImage[];
  onBatchImagesChange?: (images: UploadedImage[]) => void;
}

// Простой компонент без сложного state management
export const Canvas = memo(function Canvas({ 
  result, 
  isGenerating, 
  mode, 
  onExampleClick,
  referenceImage,
  onReferenceImageChange,
  batchMode = false,
  batchImages = [],
  onBatchImagesChange 
}: CanvasProps) {
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  
  const examples = mode === 'video' 
    ? ['Волны океана на закате', 'Кот играет с пряжей', 'Неоновый город ночью']
    : ['Космический корабль киберпанк 8k', 'Портрет с цветами в волосах', 'Неоновый город, дождь'];

  const remixExamples = mode === 'video'
    ? ['Добавить дождь и грозу', 'Превратить в ночную сцену', 'Добавить снег']
    : ['Добавить неоновое освещение', 'Превратить в киберпанк стиль', 'Добавить цветы и природу', 'Сделать в стиле аниме'];

  const handleSelectFromHistory = (selected: { preview: string; id: string }[]) => {
    if (!onBatchImagesChange) return;
    
    const historyImages: UploadedImage[] = selected.map(img => ({
      id: img.id,
      preview: img.preview,
      status: 'ready',
      source: 'history',
    }));
    
    onBatchImagesChange([...batchImages, ...historyImages]);
    toast.success(`Добавлено ${selected.length} изображений из истории`);
  };

  // Download handler
  const handleDownload = async () => {
    if (!result?.url) return;
    try {
      const response = await fetch(result.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${Date.now()}.${result.mode === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Скачано');
    } catch {
      toast.error('Ошибка скачивания');
    }
  };

  // Empty state
  if (!result && !isGenerating) {
    // Batch режим
    if (batchMode && onBatchImagesChange) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6 bg-[#0F0F10]">
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 mb-4">
                <Layers className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-sm font-medium text-[#00D9FF]">Batch режим</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Массовая обработка изображений
              </h2>
              <p className="text-sm text-[#71717A]">
                Загрузите несколько изображений и примените один промпт ко всем
              </p>
            </div>

            <BatchImageUploader
              images={batchImages}
              onImagesChange={onBatchImagesChange}
              maxImages={10}
              showHistoryButton
              onSelectFromHistory={() => setShowHistoryPicker(true)}
            />

            {batchImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[#71717A] font-medium uppercase tracking-wide">
                  Примеры промптов
                </p>
                <div className="flex flex-wrap gap-2">
                  {remixExamples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => onExampleClick?.(ex)}
                      className="px-3 py-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white text-xs transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <HistoryImagePicker
              isOpen={showHistoryPicker}
              onClose={() => setShowHistoryPicker(false)}
              onSelect={handleSelectFromHistory}
              maxSelect={10}
              mode="image"
            />
          </div>
        </div>
      );
    }

    // Если есть референсное изображение - показываем Remix режим
    if (referenceImage && onReferenceImageChange) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6 bg-[#0F0F10]">
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 mb-4">
                <Wand2 className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-sm font-medium text-[#00D9FF]">Remix режим</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Редактируйте изображение
              </h2>
              <p className="text-sm text-[#71717A]">
                Опишите, что хотите изменить или добавить
              </p>
            </div>

            <ImageUploader 
              value={referenceImage}
              onChange={onReferenceImageChange}
              mode="prominent"
            />

            <div className="space-y-2">
              <p className="text-xs text-[#71717A] font-medium uppercase tracking-wide">Примеры промптов</p>
              <div className="flex flex-wrap gap-2">
                {remixExamples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => onExampleClick?.(ex)}
                    className="px-3 py-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white text-xs transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Обычный режим T2I/T2V
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-[#0F0F10]">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#27272A] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#00D9FF]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {mode === 'video' ? 'Создайте видео' : 'Создайте изображение'}
            </h2>
            <p className="text-sm text-[#71717A]">
              Опишите что хотите увидеть
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => onExampleClick?.(ex)}
                className="px-3 py-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white text-xs transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-[#0F0F10]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-4 border-[#27272A]" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00D9FF] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#00D9FF]" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Генерация...</h3>
            <p className="text-sm text-[#71717A]">{mode === 'video' ? 'Видео' : 'Фото'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Result state
  if (result) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 bg-[#0F0F10]">
        <div className="relative max-w-full max-h-full">
          {result.mode === 'video' ? (
            <video
              src={result.url}
              className="max-w-full max-h-[calc(100vh-300px)] rounded-xl shadow-2xl"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          ) : (
            <img
              src={result.url}
              alt={result.prompt}
              className="max-w-full max-h-[calc(100vh-300px)] rounded-xl shadow-2xl"
            />
          )}
          
          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-[#00D9FF] hover:bg-[#22D3EE] text-black transition-colors"
              title="Скачать"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          {/* Prompt */}
          <div className="absolute bottom-4 left-4 max-w-[60%]">
            <p className="text-white/80 text-sm line-clamp-2 bg-black/50 backdrop-blur px-3 py-2 rounded-lg">
              {result.prompt}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
});
