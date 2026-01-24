'use client';

import { Loader2, ArrowUp, ImageIcon } from 'lucide-react';
import { ImageCard } from './ImageCard';
import type { GenerationResult } from '../GeneratorV2';

interface SimpleGalleryProps {
  images: GenerationResult[];
  isGenerating: boolean;
  onImageClick?: (image: GenerationResult) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function SimpleGallery({
  images,
  isGenerating,
  onImageClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: SimpleGalleryProps) {
  // Empty state
  if (images.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No generations yet</h3>
          <p className="text-sm text-[#A1A1AA]">
            Enter a prompt below and click Generate to create your first image
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Load More Button - at TOP */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center mb-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent hover:bg-white/5 border border-[#3F3F46]/50 text-[#A1A1AA] hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-4 h-4" />
                <span>Загрузить предыдущие</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Grid - 3 columns on desktop, 2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.map((image) => (
          <ImageCard key={image.id} image={image} onClick={onImageClick} />
        ))}
      </div>

      {/* Loading Skeleton - at BOTTOM */}
      {isGenerating && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="aspect-square rounded-sm bg-[#27272A] animate-pulse flex items-center justify-center"
            >
              <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
