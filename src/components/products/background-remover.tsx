'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Scissors, Check, Download, RotateCcw } from 'lucide-react';
import { smartRemoveBackground, downloadImage } from '@/lib/background-removal';
import { cn } from '@/lib/utils';

interface BackgroundRemoverProps {
  imageFile: File | null;
  imagePreview?: string | null;
  onRemoved: (imageUrl: string, blob?: Blob) => void;
  compact?: boolean;
}

export function BackgroundRemover({ 
  imageFile, 
  imagePreview,
  onRemoved, 
  compact = false 
}: BackgroundRemoverProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when image changes
  useEffect(() => {
    setPreview(null);
    setRemoved(false);
    setError(null);
    setProgress(0);
  }, [imageFile]);

  const handleRemove = async () => {
    if (!imageFile) return;

    setProcessing(true);
    setError(null);
    setProgress(10);

    // Simulate progress while processing
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const result = await smartRemoveBackground(imageFile);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success && result.imageUrl) {
        setPreview(result.imageUrl);
        setRemoved(true);
        onRemoved(result.imageUrl, result.blob);
      } else {
        setError(result.error || 'Не удалось удалить фон');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError('Произошла ошибка при обработке');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setRemoved(false);
    setError(null);
    setProgress(0);
  };

  const handleDownload = () => {
    if (preview) {
      const filename = imageFile?.name.replace(/\.[^/.]+$/, '') + '_no_bg.png';
      downloadImage(preview, filename);
    }
  };

  if (!imageFile) return null;

  // Compact version - just a button
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleRemove}
        disabled={processing || removed}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
          removed
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
            : "bg-white/5 text-white/70 border border-white/10 hover:border-[#c8ff00]/50 hover:text-[#c8ff00]",
          processing && "opacity-50 cursor-not-allowed"
        )}
      >
        {processing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Удаление...</span>
          </>
        ) : removed ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Фон удалён</span>
          </>
        ) : (
          <>
            <Scissors className="w-3.5 h-3.5" />
            <span>Убрать фон</span>
          </>
        )}
      </button>
    );
  }

  // Full version with preview
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#c8ff00]" />
          <span className="text-sm font-medium text-white">
            Убрать фон
          </span>
        </div>
        {removed && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <Check className="w-3 h-3" />
            Готово
          </div>
        )}
      </div>

      {/* Preview comparison */}
      {(preview || imagePreview) && (
        <div className="grid grid-cols-2 gap-2">
          {/* Original */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wide">До</span>
            <div className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
              {imagePreview && (
                <img 
                  src={imagePreview} 
                  alt="Original" 
                  className="w-full h-full object-contain p-2" 
                />
              )}
            </div>
          </div>
          
          {/* Processed */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wide">После</span>
            <div 
              className="aspect-square rounded-lg overflow-hidden border border-white/10"
              style={{
                backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                backgroundSize: '12px 12px',
                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                backgroundColor: '#0f0f0f'
              }}
            >
              {preview ? (
                <img 
                  src={preview} 
                  alt="No background" 
                  className="w-full h-full object-contain p-2" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {processing ? (
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 text-[#c8ff00] animate-spin mx-auto mb-2" />
                      <span className="text-xs text-white/40">{progress}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-white/20">Превью</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {processing && (
        <div className="space-y-1">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#c8ff00] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 text-center">
            Обработка изображения...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {removed ? (
          <>
            <Button
              size="sm"
              onClick={handleDownload}
              className="flex-1 bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="w-full bg-[#c8ff00] text-black hover:bg-[#b8ef00] disabled:bg-[#c8ff00]/30 disabled:text-black/50"
            onClick={handleRemove}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Убрать фон автоматически
              </>
            )}
          </Button>
        )}
      </div>

      {/* Info */}
      {!removed && !processing && (
        <p className="text-[10px] text-white/30 text-center">
          AI автоматически удалит фон с изображения
        </p>
      )}
    </div>
  );
}

