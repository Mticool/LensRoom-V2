'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerationResult } from '../GeneratorV2';

interface HiggsPreviewProps {
  images: GenerationResult[];
  isGenerating: boolean;
  aspectRatio: string;
  onImageClick?: (image: GenerationResult) => void;
}

export function HiggsPreview({
  images,
  isGenerating,
  aspectRatio,
  onImageClick,
}: HiggsPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ensure currentIndex is valid
  const safeIndex = useMemo(() => {
    if (images.length === 0) return 0;
    return Math.min(currentIndex, images.length - 1);
  }, [currentIndex, images.length]);

  // Get aspect ratio style
  const getAspectStyle = () => {
    // Accept: "9:16", "9/16", "9.16", "9x16", "9×16"
    const match = aspectRatio.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
    if (!match) return { aspectRatio: '1 / 1' };
    const w = Number(match[1]);
    const h = Number(match[2]);
    return { aspectRatio: `${w} / ${h}` };
  };

  // Navigation
  const goNext = () => {
    if (safeIndex < images.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const goPrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  // Download handler
  const handleDownload = async () => {
    const image = images[safeIndex];
    if (!image?.url) return;
    
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generation-${image.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Скачано');
    } catch {
      toast.error('Ошибка скачивания');
    }
  };

  const currentImage = images[safeIndex];
  const isPending = currentImage?.status === 'pending';
  const hasImages = images.length > 0;
  const hasMultiple = images.length > 1;

  // Empty state - no generations yet
  if (!hasImages && !isGenerating) {
    return (
      <div className="higgs-preview-empty">
        <div className="higgs-preview-empty-content">
          <div className="higgs-preview-empty-icon">
            <Sparkles />
          </div>
          <h2>Создайте изображение</h2>
          <p>Введите описание и нажмите Generate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="higgs-preview">
      {/* Main preview area */}
      <div className="higgs-preview-container">
        <div className="higgs-preview-frame" style={getAspectStyle()}>
          {/* Loading state */}
          {(isGenerating || isPending) && (
            <div className="higgs-preview-loading">
              <Loader2 className="animate-spin" />
              <span>Генерация...</span>
            </div>
          )}

          {/* Image */}
          {currentImage && !isPending && currentImage.url && (
            <Image
              src={currentImage.previewUrl || currentImage.url}
              alt={currentImage.prompt || 'Generated image'}
              fill
              className="higgs-preview-image"
              onClick={() => onImageClick?.(currentImage)}
              unoptimized
              priority
            />
          )}

          {/* Navigation arrows */}
          {hasMultiple && !isGenerating && (
            <>
              <button
                className="higgs-preview-nav higgs-preview-nav-left"
                onClick={goPrev}
                disabled={safeIndex === 0}
              >
                <ChevronLeft />
              </button>
              <button
                className="higgs-preview-nav higgs-preview-nav-right"
                onClick={goNext}
                disabled={safeIndex === images.length - 1}
              >
                <ChevronRight />
              </button>
            </>
          )}

          {/* Counter */}
          {hasMultiple && !isGenerating && (
            <div className="higgs-preview-counter">
              {safeIndex + 1} / {images.length}
            </div>
          )}

          {/* Actions */}
          {currentImage && !isPending && !isGenerating && (
            <div className="higgs-preview-actions">
              <button onClick={handleDownload} title="Скачать">
                <Download />
              </button>
              <button 
                onClick={() => window.open(currentImage.url, '_blank')} 
                title="Открыть"
              >
                <ExternalLink />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prompt display */}
      {currentImage && !isGenerating && (
        <div className="higgs-preview-prompt">
          <p>{currentImage.prompt}</p>
        </div>
      )}
    </div>
  );
}
