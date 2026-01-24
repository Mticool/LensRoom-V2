'use client';

import { useState } from 'react';
import { Download, Share2, RotateCcw, Loader2, ZoomIn, Link2, Maximize2, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/OptimizedMedia';
import type { GenerationResult } from './GeneratorV2';

interface ImageGalleryMasonryProps {
  images: GenerationResult[];
  isGenerating: boolean;
  layout?: 'masonry' | 'grid';
  onRegenerate?: (prompt: string, settings: any) => void;
  onImageClick?: (image: GenerationResult) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  // Pagination props
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

// Helper to check if image is ready to display
const isImageReady = (image: GenerationResult): boolean => {
  const status = image.status?.toLowerCase();
  // Skip failed, error, or no-url images
  if (status === 'failed' || status === 'error') return false;
  if (!image.url && status !== 'pending') return false;
  return true;
};

export function ImageGalleryMasonry({ 
  images, 
  isGenerating,
  layout = 'masonry',
  onRegenerate,
  onImageClick,
  emptyTitle,
  emptyDescription,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: ImageGalleryMasonryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardClassName =
    layout === "grid"
      ? "relative group rounded-xl overflow-hidden bg-[#27272A] cursor-pointer transition-colors"
      : "relative group rounded-xl overflow-hidden bg-[#27272A] cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-2xl";

  const getAspect = (size?: string): { w: number; h: number } => {
    const s = String(size || "").trim();
    const m = s.match(/^(\d+)\s*[:/]\s*(\d+)$/);
    if (!m) return { w: 1, h: 1 };
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { w: 1, h: 1 };
    return { w, h };
  };

  const getTileStyle = (size?: string) => {
    let { w, h } = getAspect(size);
    // Limit extreme aspect ratios (max 9:16 or 16:9)
    const ratio = w / h;
    if (ratio < 9/16) { w = 9; h = 16; } // Clamp very tall images
    if (ratio > 16/9) { w = 16; h = 9; } // Clamp very wide images
    
    // Cap overall visual size similar to Higgsfield reference:
    // - Max width ~350px
    // - Max height ~500px on mobile (so 9:16 stays around ~281x500)
    const maxWidthByHeight = 500 * (w / h);
    const maxWidth = Math.max(180, Math.min(350, maxWidthByHeight));
    return {
      aspectRatio: `${w} / ${h}`,
      maxWidth: `${Math.round(maxWidth)}px`,
      width: "100%",
    } as const;
  };

  const getAspectRatioStyle = (size?: string) => {
    const { w, h } = getAspect(size);
    return { aspectRatio: `${w} / ${h}` } as const;
  };

  const handleDownload = async (image: GenerationResult) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const mime = String(blob.type || "").toLowerCase();
      const preferred = String((image as any)?.settings?.outputFormat || "").toLowerCase();
      const ext =
        mime.includes("png") ? "png" :
        mime.includes("webp") ? "webp" :
        mime.includes("jpeg") || mime.includes("jpg") ? "jpg" :
        preferred === "webp" ? "webp" :
        preferred === "jpg" ? "jpg" :
        "png";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${image.id}.${ext}`;
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
    // Prefer in-app viewer if provided
    if (onImageClick) {
      onImageClick(image);
      return;
    }
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
            {emptyTitle || "Начните создавать"}
          </h3>
          <p className="text-sm text-[#A1A1AA]">
            {emptyDescription || 'Введите описание изображения и нажмите "Сгенерировать"'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-0 md:px-0 py-0">
      {/* Load More Button - at top since new items appear at bottom */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <span>Загрузить предыдущие</span>
            )}
          </button>
        </div>
      )}

      {layout === 'grid' ? (
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 320px))",
            justifyContent: "center",
          }}
        >
          {isGenerating && renderSkeletons()}
          {images.map((image) => {
            const isDemo = image.id.startsWith('demo-');
            return (
              <div
                key={image.id}
                className="justify-self-center w-full"
                style={{ maxWidth: getTileStyle(image.settings?.size).maxWidth }}
                onMouseEnter={() => setHoveredId(image.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={cardClassName}>
                  <div
                    className="relative w-full overflow-hidden"
                    onClick={() => onImageClick?.(image)}
                    style={getTileStyle(image.settings?.size)}
                  >
                    {image.status === 'pending' ? (
                      <>
                        <div className="absolute inset-0 bg-[#27272A] animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
                        </div>
                      </>
                    ) : image.status === 'failed' || image.status === 'error' || !image.url ? (
                      <>
                        <div className="absolute inset-0 bg-[#27272A]" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                          <AlertCircle className="w-8 h-8 text-red-400/60" />
                          <span className="text-xs text-[#A1A1AA] text-center">Ошибка генерации</span>
                        </div>
                      </>
                    ) : (
                      <OptimizedImage
                        src={image.previewUrl || image.url}
                        alt={image.prompt}
                        className="absolute inset-0"
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
                <div className="absolute inset-0 pointer-events-none">
                  {/* Action Buttons в правом нижнем углу (hide for demo images) */}
                  {!isDemo && (
                    <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto">
                      {/* Скачать */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                          title="Перегенерировать"
                        >
                          <RotateCcw className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Masonry Grid using CSS Columns - сохраняет aspect ratio каждого изображения */
        <div
          className="masonry-grid"
          style={{
            columnCount: 'auto',
            columnFill: 'balance',
            columnGap: '1px',
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
                className="break-inside-avoid mb-px"
                onMouseEnter={() => setHoveredId(image.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={cardClassName}>
                  {/* Image - сохраняет оригинальное соотношение сторон */}
                  <div
                    className="w-full h-auto"
                    onClick={() => onImageClick?.(image)}
                    style={{ display: 'block' }}
                  >
                    {/* Show skeleton loader for pending images */}
                    {image.status === 'pending' ? (
                      <div
                        className="w-full bg-[#27272A] animate-pulse"
                        style={getAspectRatioStyle(image.settings?.size)}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
                        </div>
                      </div>
                    ) : image.status === 'failed' || image.status === 'error' || !image.url ? (
                      <div
                        className="w-full bg-[#27272A] flex flex-col items-center justify-center gap-2 p-4"
                        style={{ ...getAspectRatioStyle(image.settings?.size), minHeight: '120px' }}
                      >
                        <AlertCircle className="w-8 h-8 text-red-400/60" />
                        <span className="text-xs text-[#A1A1AA] text-center">Ошибка генерации</span>
                      </div>
                    ) : (
                      <OptimizedImage
                        src={image.previewUrl || image.url}
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
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Action Buttons в правом нижнем углу (hide for demo images) */}
                      {!isDemo && (
                        <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto">
                          {/* Скачать */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
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
                              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                              title="Перегенерировать"
                            >
                              <RotateCcw className="w-5 h-5 text-white group-hover:text-[#CDFF00]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .masonry-grid {
          column-gap: 1px;
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
