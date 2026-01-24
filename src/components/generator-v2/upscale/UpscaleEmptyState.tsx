'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface UpscaleEmptyStateProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UpscaleEmptyState({ onFileSelect, disabled }: UpscaleEmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className="w-full max-w-2xl border-2 border-dashed border-[#3A3A3C] rounded-3xl p-8 md:p-12 flex flex-col items-center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Before/After Preview Image */}
        <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden mb-8">
          {/* Before image (left side - blurry/low quality) */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=30"
              alt="Before"
              className="w-full h-full object-cover blur-[2px] scale-[1.01]"
            />
          </div>
          
          {/* After image (right side - sharp/high quality) with clip */}
          <div 
            className="absolute inset-0"
            style={{ clipPath: 'inset(0 0 0 50%)' }}
          >
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=90"
              alt="After"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Divider line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/80 -translate-x-1/2" />
          
          {/* Slider handle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8L22 12L18 16" />
              <path d="M6 8L2 12L6 16" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-wide">
          АПСКЕЙЛ
        </h2>

        {/* Description */}
        <p className="text-[#A1A1AA] text-center mb-8 max-w-sm">
          Загрузите изображение для улучшения разрешения и качества
        </p>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
            ${disabled
              ? 'bg-[#27272A] text-[#6B6B6E] cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-100'
            }
          `}
        >
          <Upload className="w-5 h-5" />
          <span>Загрузить фото</span>
        </button>
        
        {/* Drag & Drop hint */}
        <p className="text-[#6B6B6E] text-sm mt-4">
          или перетащите файл сюда
        </p>
      </div>
    </div>
  );
}
