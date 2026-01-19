'use client';

import { useState } from 'react';
import { Download, Share2, RotateCcw, Loader2, ZoomIn, Link2, Maximize2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/OptimizedMedia';
import type { GenerationResult } from './GeneratorV2';

interface ImageGalleryMasonryProps {
  images: GenerationResult[];
  isGenerating: boolean;
  onRegenerate?: (prompt: string, settings: any) => void;
  onImageClick?: (image: GenerationResult) => void;
}

export function ImageGalleryMasonry({ 
  images, 
  isGenerating,
  onRegenerate,
  onImageClick 
}: ImageGalleryMasonryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDownload = async (image: GenerationResult) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Изображение скачано');
    } catch (error) {
      toast.error('Ошибка при скачивании');
    }
  };

  const handleShare = async (image: GenerationResult) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LensRoom - AI Generated Image',
          text: image.prompt,
          url: image.url,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(image.url);
      toast.success('Ссылка скопирована');
    }
  };

  const handleCopyLink = async (image: GenerationResult) => {
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success('Ссылка скопирована');
    } catch (error) {
      toast.error('Не удалось скопировать');
    }
  };

  const handleZoom = (image: GenerationResult) => {
    // Open in new tab for full screen view
    window.open(image.url, '_blank');
  };

  const handleRegenerate = (image: GenerationResult) => {
    if (onRegenerate) {
      onRegenerate(image.prompt, image.settings);
      toast.info('Перегенерация...');
    }
  };

  // Show loading skeletons when generating
  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, i) => (
      <div
        key={`skeleton-${i}`}
        className="relative aspect-square rounded-xl overflow-hidden bg-[#27272A] animate-pulse"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      </div>
    ));
  };

  // Don't show empty state if there are demo images
  if (images.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div className="max-w-md">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#27272A] flex items-center justify-center">
            <ZoomIn className="w-10 h-10 text-[#A1A1AA]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Начните создавать
          </h3>
          <p className="text-sm text-[#A1A1AA]">
            Введите описание изображения и нажмите "Сгенерировать"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
      {/* Masonry Grid using CSS Columns - сохраняет aspect ratio каждого изображения */}
      <div 
        className="masonry-grid"
        style={{
          columnCount: 'auto',
          columnFill: 'balance',
          columnGap: '16px',
          // Responsive columns
          ...(typeof window !== 'undefined' && {
            columnCount: window.innerWidth < 768 ? 2 : window.innerWidth < 1024 ? 3 : 4
          })
        }}
      >
        {isGenerating && renderSkeletons()}
        
        {images.map((image) => {
          const isDemo = image.id.startsWith('demo-');
          
          return (
          <div
            key={image.id}
            className="break-inside-avoid mb-4"
            onMouseEnter={() => setHoveredId(image.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="relative group rounded-xl overflow-hidden bg-[#27272A] cursor-pointer transition-transform hover:scale-[1.02]">
              {/* Image - сохраняет оригинальное соотношение сторон */}
              <div 
                className="w-full h-auto"
                onClick={() => onImageClick?.(image)}
                style={{ display: 'block' }}
              >
                {/* Show skeleton loader for pending images */}
                {image.status === 'pending' ? (
                  <div className="w-full aspect-square bg-[#27272A] animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
                  </div>
                ) : (
                  <OptimizedImage
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-auto"
                    priority={false}
                  />
                )}
              </div>
              
              {/* Demo Badge */}
              {isDemo && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#CDFF00] text-black text-xs font-medium">
                  Пример
                </div>
              )}

              {/* Hover Overlay */}
              {hoveredId === image.id && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity">
                  {/* Action Buttons в правом нижнем углу (hide for demo images) */}
                  {!isDemo && (
                    <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                      {/* Скачать */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 group"
                        title="Скачать"
                      >
                        <Download className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                      </button>
                      
                      {/* Копировать ссылку */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 group"
                        title="Копировать ссылку"
                      >
                        <Link2 className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                      </button>
                      
                      {/* Поделиться */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 group"
                        title="Поделиться"
                      >
                        <Share2 className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                      </button>
                      
                      {/* Увеличить */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoom(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 group"
                        title="Открыть в полном размере"
                      >
                        <Maximize2 className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                      </button>
                      
                      {/* Перегенерировать */}
                      {onRegenerate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegenerate(image);
                          }}
                          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-110 group"
                          title="Перегенерировать"
                        >
                          <RotateCcw className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Prompt в левом нижнем углу - минималистично */}
                  <div className="absolute bottom-3 left-3 right-16 max-w-[70%]">
                    <p className="text-xs text-white drop-shadow-lg line-clamp-2">
                      {image.prompt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      <style jsx>{`
        .masonry-grid {
          column-gap: 16px;
        }
        
        @media (max-width: 768px) {
          .masonry-grid {
            column-count: 2;
          }
        }
        
        @media (min-width: 768px) and (max-width: 1024px) {
          .masonry-grid {
            column-count: 3;
          }
        }
        
        @media (min-width: 1024px) {
          .masonry-grid {
            column-count: 4;
          }
        }
      `}</style>
    </div>
  );
}
