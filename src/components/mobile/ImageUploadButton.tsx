'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Camera } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import logger from '@/lib/logger';

interface ImageUploadButtonProps {
  onUpload: (imageUrl: string) => void;
}

export function ImageUploadButton({ onUpload }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения');
      return;
    }

    // Validate file size (max 10MB for original file)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10MB');
      return;
    }

    setIsCompressing(true);
    try {
      // Compress image
      const options = {
        maxSizeMB: 1, // Max 1MB after compression
        maxWidthOrHeight: 1920, // Max dimension
        useWebWorker: true,
        fileType: 'image/webp', // Convert to WebP for better compression
      };

      const compressedFile = await imageCompression(file, options);

      // Show compression stats
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      toast.success(`Изображение сжато: ${originalSizeMB}MB → ${compressedSizeMB}MB`);

      // Create preview URL from compressed file
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        onUpload(imageUrl);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      toast.error('Ошибка сжатия изображения');
      logger.error('Compression error:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleClick}
        disabled={isCompressing}
        className="
          w-full p-6 rounded-2xl
          bg-[rgba(255,255,255,0.03)] border-2 border-dashed border-[rgba(255,255,255,0.12)]
          hover:border-[#8cf425] hover:bg-[#8cf425]/5
          transition-all active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[#8cf425]/10 border border-[#8cf425]/20 flex items-center justify-center">
            {isCompressing ? (
              <div className="w-8 h-8 border-2 border-[#8cf425]/30 border-t-[#8cf425] rounded-full animate-spin" />
            ) : (
              <ImagePlus className="w-8 h-8 text-[#8cf425]" />
            )}
          </div>

          <div className="text-center">
            <div className="text-base font-semibold text-white mb-1">
              {isCompressing ? 'Сжатие изображения...' : 'Загрузить изображение'}
            </div>
            <div className="text-xs text-white/40">
              {isCompressing ? 'Подождите, идет оптимизация' : 'Нажмите для выбора или сделайте фото'}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <Camera className="w-4 h-4" />
            <span>PNG, JPG, WebP до 10MB</span>
          </div>
        </div>
      </button>
    </div>
  );
}
