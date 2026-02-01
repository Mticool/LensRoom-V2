'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share2, RotateCcw, Loader2, ZoomIn, Maximize2, AlertCircle, Heart, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { OptimizedImage } from '@/components/ui/OptimizedMedia';
import type { GenerationResult } from './GeneratorV2';
import { useFavoritesStore } from '@/stores/favorites-store';

interface ImageGalleryMasonryProps {
  images: GenerationResult[];
  isGenerating: boolean;
  layout?: 'masonry' | 'grid' | 'feed';
  onRegenerate?: (prompt: string, settings: any) => void;
  onImageClick?: (image: GenerationResult) => void;
  /** Use an existing image as a reference for i2i flows. */
  onUseAsReference?: (image: GenerationResult) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Auto-scroll to the bottom when new items appear (only if user is near bottom). */
  autoScrollToBottom?: boolean;
  /** Consider user "near bottom" within this many pixels. Default: 240. */
  autoScrollThresholdPx?: number;
  // Pagination props
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** Enable drag and drop for tool models (Recraft, Topaz) */
  enableDragDrop?: boolean;
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
  onUseAsReference,
  emptyTitle,
  emptyDescription,
  autoScrollToBottom = false,
  autoScrollThresholdPx = 240,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  enableDragDrop = false,
}: ImageGalleryMasonryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { toggleFavorite, isFavorite: isFavoriteId } = useFavoritesStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastLenRef = useRef<number>(images.length);
  const cardClassName =
    layout === "grid" || layout === "feed"
      ? "higgs-gallery-item group"
      : "relative group rounded-none overflow-hidden bg-[#27272A] cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-2xl";

  const getAspect = (size?: string): { w: number; h: number } => {
    const s = String(size || "").trim();
    // Accept common shorthands: "9:16", "9/16", "9.16", "9x16", "9×16"
    const m = s.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
    if (!m) return { w: 1, h: 1 };
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { w: 1, h: 1 };
    return { w, h };
  };

  const getTileStyle = (size?: string) => {
    let { w, h } = getAspect(size);
    const ratio = w / h;
    if (ratio < 9/16) { w = 9; h = 16; }
    if (ratio > 16/9) { w = 16; h = 9; }
    return {
      aspectRatio: `${w} / ${h}`,
      width: "100%",
    } as const;
  };

  /** data-aspect for Higgsfield-style cards (reference: gallery-item) */
  const getDataAspect = (size?: string): string => {
    let { w, h } = getAspect(size);
    const ratio = w / h;
    if (ratio < 9/16) { w = 9; h = 16; }
    if (ratio > 16/9) { w = 16; h = 9; }
    return `${w}:${h}`;
  };

  const getAspectRatioStyle = (size?: string) => {
    const { w, h } = getAspect(size);
    return { aspectRatio: `${w} / ${h}` } as const;
  };

  // Auto-scroll to bottom when new images are appended (only if user is already near bottom).
  useEffect(() => {
    if (!autoScrollToBottom) {
      lastLenRef.current = images.length;
      return;
    }

    const el = scrollRef.current;
    if (!el) {
      lastLenRef.current = images.length;
      return;
    }

    const prevLen = lastLenRef.current;
    const nextLen = images.length;
    lastLenRef.current = nextLen;
    if (nextLen <= prevLen) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= autoScrollThresholdPx;
    if (!nearBottom) return;

    // Wait for layout to commit then scroll.
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [autoScrollToBottom, autoScrollThresholdPx, images.length]);

  const handleDownload = async (image: GenerationResult) => {
    if (!image?.url) return;
    try {
      const isDemo = String(image.id || "").startsWith("demo-");
      const downloadUrl = !isDemo && image.id ? `/api/generations/${encodeURIComponent(image.id)}/download?kind=original` : image.url;
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) throw new Error("download_failed");

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
      // Fallback to direct URL open
      try {
        window.open(image.url, "_blank");
      } catch {}
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

  const handleToggleFavorite = async (image: GenerationResult) => {
    if (!image?.id) return;
    // Avoid toggling for placeholders/demos
    if (String(image.id).startsWith("demo-") || String(image.id).startsWith("pending_")) return;
    const currently = isFavoriteId(image.id);
    try {
      await toggleFavorite(image.id);
      toast.success(currently ? "Удалено из избранного" : "Добавлено в избранное");
    } catch {
      toast.error("Не удалось сохранить");
    }
  };

  const handleUseAsReference = (image: GenerationResult) => {
    if (!onUseAsReference) return;
    onUseAsReference(image);
  };

  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, i) => (
      <div
        key={`skeleton-${i}`}
        className="higgs-gallery-item overflow-hidden bg-[#27272A] animate-pulse border border-white/[0.08]"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      </div>
    ));
  };

  // Don't show empty state if there are demo images
  if (images.length === 0 && !isGenerating) {
    const isUploadTool = emptyTitle?.toLowerCase().includes('загрузите') || emptyDescription?.toLowerCase().includes('загрузите');
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4 py-12 md:py-20">
        <div className="max-w-sm w-full">
          <div className={`w-28 h-28 mx-auto mb-6 rounded-2xl ${isUploadTool ? 'bg-[#1C1C1E] border-2 border-[#f59e0b]/30' : 'bg-[#1C1C1E] border border-white/10'} flex items-center justify-center`}>
            {isUploadTool ? (
              <ImagePlus className="w-14 h-14 text-[#f59e0b]" strokeWidth={2} />
            ) : (
              <ZoomIn className="w-14 h-14 text-[#A1A1AA]" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            {emptyTitle || "Начните создавать"}
          </h3>
          <p className="text-base text-[#A1A1AA] leading-relaxed px-4">
            {emptyDescription || 'Введите описание изображения и нажмите "Сгенерировать"'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Load More Button - at top since new items appear at bottom */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-transparent hover:bg-white/5 border border-[#3F3F46]/50 text-[#A1A1AA] hover:text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {(layout === 'grid' || layout === 'feed') ? (
        <div className={layout === 'feed' ? 'feed-grid' : 'higgs-grid'} data-layout={layout}>
          {isGenerating && renderSkeletons()}
          {images.map((image) => {
            const isDemo = image.id.startsWith('demo-');
            return (
              <div
                key={image.id}
                className="w-full"
                onMouseEnter={() => setHoveredId(image.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className={cardClassName}
                  data-aspect={getDataAspect(image.settings?.size)}
                  style={{
                    ...getTileStyle(image.settings?.size),
                    cursor: enableDragDrop && onUseAsReference && image.url && image.status !== 'pending' && image.status !== 'failed' ? 'grab' : undefined,
                  }}
                  draggable={!!(enableDragDrop && onUseAsReference && image.url && image.status !== 'pending' && image.status !== 'failed')}
                  onDragStart={(e) => {
                    if (!enableDragDrop || !onUseAsReference || !image.url) return;
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      id: image.id,
                      url: image.url,
                      prompt: image.prompt,
                      settings: image.settings,
                    }));
                    const img = new Image();
                    img.src = image.previewUrl || image.url;
                    e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
                  }}
                  onClick={() => onImageClick?.(image)}
                >
                  <div data-image-wrap className="absolute inset-0 w-full h-full overflow-hidden">
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
                        className="absolute inset-0 w-full h-full object-cover block"
                        priority={false}
                      />
                    )}
                  </div>

                  <div className="higgs-gallery-label">
                    {image.prompt || ''}
                  </div>
              
              {isDemo && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#f59e0b] text-black text-xs font-medium z-10">
                  Пример
                </div>
              )}

              {hoveredId === image.id && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Action Buttons в правом нижнем углу (hide for demo images) */}
                  {!isDemo && (
                    <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto">
                      {/* Открыть / View */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleZoom(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                        title="Открыть"
                      >
                        <Maximize2 className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                      </button>
                      
                      {/* Использовать как референс */}
                      {onUseAsReference && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUseAsReference(image);
                          }}
                          className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                          title="Использовать как референс"
                        >
                          <ImagePlus className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                        </button>
                      )}

                      {/* Скачать */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                        title="Скачать"
                      >
                        <Download className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                      </button>

                      {/* В избранное */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleFavorite(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                        title="В избранное"
                      >
                        <Heart
                          className={`w-5 h-5 group-hover:text-[#f59e0b] ${
                            image.id && isFavoriteId(image.id) ? "text-rose-400" : "text-white"
                          }`}
                        />
                      </button>

                      {/* Поделиться (fallback = copy link) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(image);
                        }}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                        title="Поделиться"
                      >
                        <Share2 className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
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
                          <RotateCcw className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
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
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#f59e0b] text-black text-xs font-medium">
                      Пример
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {hoveredId === image.id && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Action Buttons в правом нижнем углу (hide for demo images) */}
                      {!isDemo && (
                        <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto">
                          {/* Открыть / View */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleZoom(image);
                            }}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                            title="Открыть"
                          >
                            <Maximize2 className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                          </button>

                          {/* Использовать как референс */}
                          {onUseAsReference && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseAsReference(image);
                              }}
                              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                              title="Использовать как референс"
                            >
                              <ImagePlus className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                            </button>
                          )}

                          {/* Скачать */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                            title="Скачать"
                          >
                            <Download className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                          </button>

                          {/* В избранное */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleFavorite(image);
                            }}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                            title="В избранное"
                          >
                            <Heart
                              className={`w-5 h-5 group-hover:text-[#f59e0b] ${
                                image.id && isFavoriteId(image.id) ? "text-rose-400" : "text-white"
                              }`}
                            />
                          </button>

                          {/* Поделиться (fallback = copy link) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(image);
                            }}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 group"
                            title="Поделиться"
                          >
                            <Share2 className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
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
                              <RotateCcw className="w-5 h-5 text-white group-hover:text-[#f59e0b]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Prompt caption */}
                <div className="mt-2">
                  <div className="text-[11px] leading-snug text-white/75 line-clamp-2">
                    {image.prompt || ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
