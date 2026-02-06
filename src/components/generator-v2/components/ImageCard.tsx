'use client';

import { useState } from 'react';
import { Download, ZoomIn, Loader2, AlertCircle } from 'lucide-react';
import type { GenerationResult } from '../GeneratorV2';

interface ImageCardProps {
  image: GenerationResult;
  onClick?: (image: GenerationResult) => void;
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();

      // Detect file extension from MIME type
      const mime = String(blob.type || "").toLowerCase();
      const ext =
        mime.includes("png") ? "png" :
        mime.includes("webp") ? "webp" :
        mime.includes("jpeg") || mime.includes("jpg") ? "jpg" :
        "png";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${image.id}.${ext}`;
      a.style.display = 'none';

      document.body.appendChild(a);

      // Use setTimeout for better mobile compatibility
      setTimeout(() => {
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      }, 0);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const isPending = image.status === 'pending';
  const isFailed = image.status === 'failed' || image.status === 'error';

  return (
    <div
      className="relative group rounded-sm overflow-hidden bg-[#27272A] cursor-pointer aspect-square"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(image)}
    >
      {/* Image */}
      {isPending ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#27272A] animate-pulse">
          <Loader2 className="w-8 h-8 text-[#A1A1AA] animate-spin" />
        </div>
      ) : isFailed || imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#27272A]">
          <AlertCircle className="w-8 h-8 text-red-400/60 mb-2" />
          <span className="text-xs text-[#A1A1AA]">Failed</span>
        </div>
      ) : (
        <img
          src={image.previewUrl || image.url}
          alt={image.prompt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* Hover Overlay */}
      {isHovered && !isPending && !isFailed && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            title="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(image);
            }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
            title="View Full Size"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
