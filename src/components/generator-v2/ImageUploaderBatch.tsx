'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  id: string;
  file?: File;
  preview: string; // URL or base64
  status: 'ready' | 'uploading' | 'error';
}

interface ImageUploaderBatchProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number; // Максимальное количество изображений
  mode: 'compact' | 'prominent';
  className?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function ImageUploaderBatch({ 
  images, 
  onImagesChange, 
  maxImages = 10,
  mode, 
  className, 
  disabled 
}: ImageUploaderBatchProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    // Проверка лимита
    if (images.length + files.length > maxImages) {
      toast.error(`Максимум ${maxImages} изображений`);
      return;
    }

    setIsUploading(true);
    const validFiles: File[] = [];

    // Валидация файлов
    Array.from(files).forEach(file => {
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        toast.error(`${file.name}: неподдерживаемый формат`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: файл слишком большой (макс 10MB)`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    // Конвертация в base64
    const newImages: UploadedImage[] = [];
    
    for (const file of validFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newImages.push({
          id: crypto.randomUUID(),
          file,
          preview: base64,
          status: 'ready',
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error reading file:', file.name, error);
        }
        toast.error(`Ошибка загрузки ${file.name}`);
      }
    }

    onImagesChange([...images, ...newImages]);
    toast.success(`Загружено ${newImages.length} изображений`);
    setIsUploading(false);
  }, [images, onImagesChange, maxImages]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled, isUploading]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, isUploading, handleFiles]);

  const handleRemoveImage = useCallback((id: string) => {
    const filtered = images.filter(img => img.id !== id);
    onImagesChange(filtered);
    
    // Очистить preview URL если это blob
    const removed = images.find(img => img.id === id);
    if (removed?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview);
    }
  }, [images, onImagesChange]);

  const handleClearAll = useCallback(() => {
    // Очистить все blob URLs
    images.forEach(img => {
      if (img.preview.startsWith('blob:')) {
        URL.revokeObjectURL(img.preview);
      }
    });
    onImagesChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images, onImagesChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // Compact mode - для сайдбара
  if (mode === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">
            Референсы ({images.length}/{maxImages})
          </label>
          {images.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] text-[#EF4444] hover:text-red-400 transition-colors"
              disabled={disabled || isUploading}
            >
              Очистить всё
            </button>
          )}
        </div>
        
        {/* Grid of uploaded images */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative rounded-lg overflow-hidden border border-[#27272A] group">
                <img 
                  src={image.preview} 
                  alt="Reference" 
                  className="w-full h-16 object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  disabled={disabled || isUploading}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {images.length < maxImages && (
          <label 
            className={cn(
              "flex flex-col items-center justify-center h-16 rounded-lg border border-dashed transition-all cursor-pointer bg-[#27272A]/30",
              dragActive 
                ? "border-[#00D9FF] bg-[#00D9FF]/10" 
                : "border-[#3F3F46] hover:border-[#52525B]",
              (disabled || isUploading) && "opacity-50 cursor-not-allowed"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled || isUploading}
              multiple
            />
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-[#71717A] animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 text-[#71717A] mb-1" />
                <span className="text-[10px] text-[#71717A]">
                  Загрузить ({images.length}/{maxImages})
                </span>
              </>
            )}
          </label>
        )}
      </div>
    );
  }

  // Prominent mode - для главного Canvas
  return (
    <div className={cn("w-full", className)}>
      {images.length > 0 ? (
        // Grid of images with actions
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#00D9FF]" />
              <span className="text-sm font-medium text-white">
                Загружено изображений: {images.length}/{maxImages}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClick}
                disabled={disabled || isUploading || images.length >= maxImages}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-3 h-3" />
                Добавить ещё
              </button>
              <button
                onClick={handleClearAll}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Очистить всё
              </button>
            </div>
          </div>

          {/* Images grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div 
                key={image.id} 
                className="relative rounded-xl overflow-hidden border border-[#27272A] group bg-[#18181B] aspect-square"
              >
                <img 
                  src={image.preview} 
                  alt="Reference" 
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    disabled={disabled || isUploading}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
            multiple
          />
        </div>
      ) : (
        // Upload zone
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[300px] flex flex-col items-center justify-center p-8 bg-[#18181B]/50",
            dragActive 
              ? "border-[#00D9FF] bg-[#00D9FF]/10 scale-[1.02]" 
              : "border-[#27272A] hover:border-[#3F3F46] hover:bg-[#18181B]",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
            multiple
          />
          
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            {isUploading ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#00D9FF]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Загрузка...</h3>
                  <p className="text-sm text-[#71717A]">Обрабатываем изображения</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#00D9FF]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-[#00D9FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {dragActive ? 'Отпустите для загрузки' : 'Загрузите изображения'}
                  </h3>
                  <p className="text-sm text-[#71717A] mb-4">
                    Перетащите файлы сюда или нажмите для выбора
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D9FF] text-[#0F0F10] text-sm font-medium hover:bg-[#22D3EE] transition-colors">
                    <Upload className="w-4 h-4" />
                    Выбрать файлы
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#52525B]">
                  <span>PNG, JPG, WEBP</span>
                  <span>•</span>
                  <span>До 10MB каждый</span>
                  <span>•</span>
                  <span>Макс {maxImages} шт</span>
                </div>
              </>
            )}
          </div>

          {dragActive && (
            <div className="absolute inset-0 rounded-2xl bg-[#00D9FF]/5 pointer-events-none animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

