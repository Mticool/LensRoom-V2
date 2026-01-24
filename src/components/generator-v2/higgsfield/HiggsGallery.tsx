'use client';

import Image from 'next/image';
import { Download, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerationResult } from '../GeneratorV2';

interface HiggsGalleryProps {
  images: GenerationResult[];
  isGenerating: boolean;
  aspectRatio: string;
  onImageClick?: (image: GenerationResult) => void;
}

export function HiggsGallery({
  images,
  isGenerating,
  aspectRatio,
  onImageClick,
}: HiggsGalleryProps) {
  // Download handler
  const handleDownload = async (image: GenerationResult, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Empty state
  if (images.length === 0 && !isGenerating) {
    return (
      <div className="higgs-gallery-empty">
        <div className="higgs-gallery-empty-icon">
          <Sparkles />
        </div>
        <h2>Создайте изображение</h2>
        <p>Введите описание и нажмите Generate</p>
      </div>
    );
  }

  return (
    <div className="higgs-gallery">
      {/* Masonry columns */}
      <div className="higgs-masonry">
        {/* Loading skeletons when generating */}
        {isGenerating &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="higgs-masonry-item">
              <div className="higgs-gallery-skeleton" data-aspect={aspectRatio}>
                <Loader2 className="animate-spin" />
              </div>
            </div>
          ))}

        {/* Images */}
        {images.map((image) => {
          const isPending = image.status === 'pending';

          return (
            <div
              key={image.id}
              className="higgs-masonry-item"
              onClick={() => !isPending && onImageClick?.(image)}
            >
              {/* Pending */}
              {isPending && (
                <div className="higgs-gallery-skeleton" data-aspect={aspectRatio}>
                  <Loader2 className="animate-spin" />
                </div>
              )}

              {/* Image */}
              {!isPending && image.url && (
                <div className="higgs-image-wrap">
                  <Image
                    src={image.previewUrl || image.url}
                    alt={image.prompt || ''}
                    width={400}
                    height={600}
                    className="higgs-gallery-image"
                    unoptimized
                  />

                  {/* Hover overlay */}
                  <div className="higgs-gallery-overlay">
                    <div className="higgs-gallery-actions">
                      <button onClick={(e) => handleDownload(image, e)} title="Скачать">
                        <Download />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(image.url, '_blank');
                        }}
                        title="Открыть"
                      >
                        <ExternalLink />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
