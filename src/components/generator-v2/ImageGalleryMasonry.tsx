'use client';

import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { Download, Share2, RotateCcw, Loader2, Maximize2, AlertCircle, Heart, ImagePlus, MoreVertical } from 'lucide-react';
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
  /** Show prompt label on cards (Higgsfield-style: false = cleaner). Default: false. */
  showLabel?: boolean;
  /** Full width layout (no max-width). Default: false. */
  fullWidth?: boolean;
}

// Helper to check if image is ready to display
const isImageReady = (image: GenerationResult): boolean => {
  const status = image.status?.toLowerCase();
  // Skip failed, error, or no-url images
  if (status === 'failed' || status === 'error') return false;
  if (!image.url && status !== 'pending') return false;
  return true;
};

const ImageGalleryMasonryComponent = ({
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
  showLabel = false,
  fullWidth = false,
}: ImageGalleryMasonryProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { toggleFavorite, isFavorite: isFavoriteId } = useFavoritesStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastLenRef = useRef<number>(images.length);

  const cardClassName = useMemo(() =>
    layout === "grid" || layout === "feed"
      ? "higgs-gallery-item group"
      : "relative group rounded-none overflow-hidden bg-[#27272A] cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-2xl",
    [layout]
  );

  const getAspect = useCallback((size?: string): { w: number; h: number } => {
    const s = String(size || "").trim();
    // Accept common shorthands: "9:16", "9/16", "9.16", "9x16", "9×16"
    const m = s.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
    if (!m) return { w: 1, h: 1 };
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { w: 1, h: 1 };
    return { w, h };
  }, []);

  const getTileStyle = useCallback((size?: string) => {
    let { w, h } = getAspect(size);
    const ratio = w / h;
    if (ratio < 9/16) { w = 9; h = 16; }
    if (ratio > 16/9) { w = 16; h = 9; }
    return {
      aspectRatio: `${w} / ${h}`,
      width: "100%",
    } as const;
  }, [getAspect]);

  /** data-aspect for Higgsfield-style cards (reference: gallery-item) */
  const getDataAspect = useCallback((size?: string): string => {
    let { w, h } = getAspect(size);
    const ratio = w / h;
    if (ratio < 9/16) { w = 9; h = 16; }
    if (ratio > 16/9) { w = 16; h = 9; }
    return `${w}:${h}`;
  }, [getAspect]);

  const getAspectRatioStyle = useCallback((size?: string) => {
    const { w, h } = getAspect(size);
    return { aspectRatio: `${w} / ${h}` } as const;
  }, [getAspect]);

  // Close "more" menu on click outside (not on trigger or menu)
  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.gallery-more-menu') || t.closest('.gallery-more-trigger')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

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

  const handleDownload = useCallback(async (image: GenerationResult) => {
    if (!image?.url) return;
    try {
      const isDemo = String(image.id || "").startsWith("demo-");
      // Always use proxy=1 to avoid CORS issues and work without VPN
      const downloadUrl = !isDemo && image.id 
        ? `/api/generations/${encodeURIComponent(image.id)}/download?kind=original&proxy=1` 
        : image.url;
      
      console.log('[Download] Fetching:', downloadUrl);
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) {
        console.error('[Download] Failed:', response.status, response.statusText);
        throw new Error("download_failed");
      }

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
      // Create download link with proper MIME type
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${image.id}.${ext}`;
      a.style.display = 'none';

      // For mobile browsers - trigger download with timeout
      document.body.appendChild(a);

      // Use setTimeout to ensure DOM is ready and download works on mobile
      setTimeout(() => {
        a.click();

        // Clean up after download
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      }, 0);

      toast.success('Изображение скачано');
    } catch (error) {
      console.error('[Download] Error:', error);
      toast.error('Ошибка при скачивании');
    }
  }, []);

  const handleShare = useCallback(async (image: GenerationResult) => {
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
  }, []);

  const handleZoom = useCallback((image: GenerationResult) => {
    // Prefer in-app viewer if provided
    if (onImageClick) {
      onImageClick(image);
      return;
    }
    window.open(image.url, '_blank');
  }, [onImageClick]);

  const handleRegenerate = useCallback((image: GenerationResult) => {
    if (onRegenerate) {
      onRegenerate(image.prompt, image.settings);
      toast.info('Перегенерация...');
    }
  }, [onRegenerate]);

  const handleToggleFavorite = useCallback(async (image: GenerationResult) => {
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
  }, [toggleFavorite, isFavoriteId]);

  const handleUseAsReference = useCallback((image: GenerationResult) => {
    if (!onUseAsReference) return;
    onUseAsReference(image);
  }, [onUseAsReference]);

  const renderSkeletons = useCallback(() => {
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
  }, []);

  // Don't show empty state if there are demo images
  if (images.length === 0 && !isGenerating) {
    const isUploadTool = emptyTitle?.toLowerCase().includes('загрузите') || emptyDescription?.toLowerCase().includes('загрузите');
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4 py-12 md:py-20">
        <div className="max-w-md w-full">
          {/* Higgsfield-style: inspiring placeholder image instead of icon */}
          <div className={`relative w-full max-w-[280px] mx-auto mb-6 rounded-none overflow-hidden aspect-[4/5] ${isUploadTool ? 'border-2 border-[#f59e0b]/30' : 'border border-white/[0.08]'}`}>
            {isUploadTool ? (
              <div className="absolute inset-0 bg-[#1C1C1E] flex items-center justify-center">
                <ImagePlus className="w-16 h-16 text-[#f59e0b]" strokeWidth={2} />
              </div>
            ) : (
              <OptimizedImage
                src="/showcase/1.jpg"
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
            {emptyTitle || "Создайте изображение"}
          </h3>
          <p className="text-sm md:text-base text-[#A1A1AA] leading-relaxed">
            {emptyDescription || 'Опишите картинку и нажмите «Сгенерировать»'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto h-full min-h-0">
      <div className={`w-full mx-auto py-6 px-4 md:px-6 ${fullWidth ? 'max-w-none' : 'max-w-7xl lg:px-12 md:px-8'}`}>
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
        <div className={layout === 'feed' ? 'feed-grid' : fullWidth ? 'higgs-grid higgs-grid-fullwidth' : 'higgs-grid'} data-layout={layout}>
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
                        generationId={image.id}
                        className="absolute inset-0 w-full h-full object-cover block"
                        priority={false}
                      />
                    )}
                  </div>

                  {showLabel && (
                    <div className="higgs-gallery-label">
                      {image.prompt || ''}
                    </div>
                  )}
              
              {isDemo && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#f59e0b] text-black text-xs font-medium z-10">
                  Пример
                </div>
              )}

              {hoveredId === image.id && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Higgsfield-style: 3 primary + More menu (hide for demo images) */}
                  {!isDemo && (
                    <div className="absolute bottom-3 right-3 flex flex-row gap-1.5 pointer-events-auto">
                      {/* Primary: Open */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleZoom(image); }}
                        className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group"
                        title="Открыть"
                      >
                        <Maximize2 className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                      </button>
                      {/* Primary: Download */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                        className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group"
                        title="Скачать"
                      >
                        <Download className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                      </button>
                      {/* Primary: Favorite */}
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleToggleFavorite(image); }}
                        className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group"
                        title="В избранное"
                      >
                        <Heart className={`w-4 h-4 group-hover:text-[#ccff00] ${image.id && isFavoriteId(image.id) ? "text-rose-400 fill-rose-400/30" : "text-white"}`} />
                      </button>
                      {/* More menu (Share + optional Reference, Regenerate) */}
                      <div className="relative gallery-more-trigger">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === image.id ? null : image.id); }}
                            className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group"
                            title="Ещё"
                          >
                            <MoreVertical className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                          </button>
                          {openMenuId === image.id && (
                            <div className="gallery-more-menu absolute bottom-full right-0 mb-1 py-1 min-w-[160px] rounded-lg bg-[#1a1a1c] border border-white/10 shadow-xl z-20">
                              {onUseAsReference && (
                                <button onClick={(e) => { e.stopPropagation(); handleUseAsReference(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                  <ImagePlus className="w-4 h-4" /> Референс
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleShare(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                <Share2 className="w-4 h-4" /> Поделиться
                              </button>
                              {onRegenerate && (
                                <button onClick={(e) => { e.stopPropagation(); handleRegenerate(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                  <RotateCcw className="w-4 h-4" /> Перегенерировать
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
            columnGap: '6px',
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
                className="break-inside-avoid mb-1.5"
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

                  {/* Hover Overlay - Higgsfield-style: 3 primary + More */}
                  {hoveredId === image.id && (
                    <div className="absolute inset-0 pointer-events-none">
                      {!isDemo && (
                        <div className="absolute bottom-3 right-3 flex flex-row gap-1.5 pointer-events-auto">
                          <button onClick={(e) => { e.stopPropagation(); handleZoom(image); }} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group" title="Открыть">
                            <Maximize2 className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(image); }} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group" title="Скачать">
                            <Download className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); void handleToggleFavorite(image); }} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group" title="В избранное">
                            <Heart className={`w-4 h-4 group-hover:text-[#ccff00] ${image.id && isFavoriteId(image.id) ? "text-rose-400 fill-rose-400/30" : "text-white"}`} />
                          </button>
                          <div className="relative gallery-more-trigger">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === image.id ? null : image.id); }} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 backdrop-blur-md transition-all group" title="Ещё">
                              <MoreVertical className="w-4 h-4 text-white group-hover:text-[#ccff00]" />
                            </button>
                            {openMenuId === image.id && (
                              <div className="gallery-more-menu absolute bottom-full right-0 mb-1 py-1 min-w-[160px] rounded-lg bg-[#1a1a1c] border border-white/10 shadow-xl z-20">
                                {onUseAsReference && (
                                  <button onClick={(e) => { e.stopPropagation(); handleUseAsReference(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                    <ImagePlus className="w-4 h-4" /> Референс
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleShare(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                  <Share2 className="w-4 h-4" /> Поделиться
                                </button>
                                {onRegenerate && (
                                  <button onClick={(e) => { e.stopPropagation(); handleRegenerate(image); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4" /> Перегенерировать
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Prompt caption - only when showLabel */}
                {showLabel && (
                  <div className="mt-2">
                    <div className="text-[11px] leading-snug text-white/75 line-clamp-2">
                      {image.prompt || ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .masonry-grid {
          column-gap: 6px;
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
};

export const ImageGalleryMasonry = memo(ImageGalleryMasonryComponent);
