'use client';

import { X, Sparkles, Loader2, Download, Plus } from 'lucide-react';

interface UpscaleImagePreviewProps {
  imageUrl: string;
  resultUrl?: string;
  onRemove: () => void;
  onUpscale: () => void;
  onDownload?: () => void;
  onNewImage?: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export function UpscaleImagePreview({
  imageUrl,
  resultUrl,
  onRemove,
  onUpscale,
  onDownload,
  onNewImage,
  isProcessing,
  disabled,
}: UpscaleImagePreviewProps) {
  const displayUrl = resultUrl || imageUrl;
  const hasResult = !!resultUrl;

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#0A0A0A]">
      <div className="relative w-full max-w-4xl">
        {/* Image Container */}
        <div className="relative rounded-2xl overflow-hidden bg-[#18181B] border border-[#27272A]">
          {/* Remove button */}
          <button
            onClick={onRemove}
            disabled={isProcessing}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Удалить изображение"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image */}
          <img
            src={displayUrl}
            alt={hasResult ? "Upscaled image" : "Original image"}
            className="w-full h-auto max-h-[70vh] object-contain"
          />

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-[#f59e0b] animate-spin" />
                <span className="text-white font-medium">Обработка изображения...</span>
              </div>
            </div>
          )}

          {/* Upscale button overlay (only when no result and not processing) */}
          {!hasResult && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={onUpscale}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                  ${disabled
                    ? 'bg-[#27272A] text-[#6B6B6E] cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-100 shadow-xl'
                  }
                `}
              >
                <Sparkles className="w-5 h-5" />
                <span>Апскейл</span>
              </button>
            </div>
          )}
        </div>

        {/* Result label */}
        {hasResult && (
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#f59e0b]/90 text-black text-sm font-semibold">
            Готово
          </div>
        )}

        {/* Action buttons for result */}
        {hasResult && !isProcessing && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f59e0b] text-black font-medium hover:bg-[#fbbf24] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Скачать</span>
              </button>
            )}
            {onNewImage && (
              <button
                onClick={onNewImage}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#27272A] text-white font-medium hover:bg-[#3A3A3C] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Новое фото</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
