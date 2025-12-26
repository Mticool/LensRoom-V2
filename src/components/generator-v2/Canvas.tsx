'use client';

import { memo } from 'react';
import { Sparkles, Download, Maximize2 } from 'lucide-react';
import { GenerationResult, GeneratorMode } from './GeneratorV2';
import { toast } from 'sonner';

interface CanvasProps {
  result: GenerationResult | null;
  isGenerating: boolean;
  mode: GeneratorMode;
  onExampleClick?: (prompt: string) => void;
}

// Простой компонент без сложного state management
export const Canvas = memo(function Canvas({ 
  result, 
  isGenerating, 
  mode, 
  onExampleClick 
}: CanvasProps) {
  
  const examples = mode === 'video' 
    ? ['Волны океана на закате', 'Кот играет с пряжей', 'Неоновый город ночью']
    : ['Космический корабль киберпанк 8k', 'Портрет с цветами в волосах', 'Неоновый город, дождь'];

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
