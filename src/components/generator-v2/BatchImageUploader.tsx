'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, X, History, Loader2, ImagePlus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedImage {
  id: string;
  file?: File;
  preview: string; // dataURL или URL
  status: 'ready' | 'uploading' | 'error';
  source?: 'upload' | 'history'; // откуда взято изображение
}

interface BatchImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  className?: string;
  disabled?: boolean;
  showHistoryButton?: boolean;
  onSelectFromHistory?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_MAX_IMAGES = 10;

export function BatchImageUploader({
  images,
  onImagesChange,
  maxImages = DEFAULT_MAX_IMAGES,
  className,
  disabled,
  showHistoryButton = true,
  onSelectFromHistory,
}: BatchImageUploaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Проверка лимита
    if (images.length + files.length > maxImages) {
      toast.error(`Максимум ${maxImages} изображений`);
      return;
    }

    // Валидация и создание превью
    const newImages: UploadedImage[] = [];
    
    for (const file of Array.from(files)) {
      // Валидация типа
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        toast.error(`${file.name}: неподдерживаемый формат`);
        continue;
      }

      // Валидация размера
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: файл слишком большой (макс 10MB)`);
        continue;
      }

      try {
        const preview = await readFileAsDataURL(file);
        newImages.push({
          id: crypto.randomUUID(),
          file,
          preview,
          status: 'ready',
          source: 'upload',
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error reading file:', error);
        }
        toast.error(`${file.name}: ошибка чтения файла`);
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast.success(`Загружено ${newImages.length} изображений`);
    }

    setShowMenu(false);
  }, [images, maxImages, onImagesChange]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    handleFiles(files);
  }, [handleFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const removeImage = useCallback((id: string) => {
    const newImages = images.filter(img => img.id !== id);
    onImagesChange(newImages);
    
    // Очистка URL.createObjectURL если использовался
    const removedImage = images.find(img => img.id === id);
    if (removedImage?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removedImage.preview);
    }
  }, [images, onImagesChange]);

  const handleSelectFromHistoryClick = useCallback(() => {
    setShowMenu(false);
    onSelectFromHistory?.();
  }, [onSelectFromHistory]);

  return (
    <div className={cn("relative", className)}>
      {/* Кнопка добавления */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => !disabled && setShowMenu(!showMenu)}
          disabled={disabled || images.length >= maxImages}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all",
            dragActive 
              ? "border-[#8cf425] bg-[#8cf425]/10 scale-[1.02]" 
              : "border-[#3F3F46] hover:border-[#52525B] bg-[#27272A]/30",
            (disabled || images.length >= maxImages) && "opacity-50 cursor-not-allowed",
            images.length === 0 && "min-h-[120px]"
          )}
        >
          <ImagePlus className={cn(
            "w-5 h-5 transition-colors",
            dragActive ? "text-[#8cf425]" : "text-[#71717A]"
          )} />
          <span className="text-sm font-medium text-[#E4E4E7]">
            {dragActive 
              ? 'Отпустите для загрузки' 
              : images.length === 0 
                ? 'Добавить изображения'
                : `Добавить ещё (${images.length}/${maxImages})`
            }
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-[#71717A] transition-transform",
            showMenu && "rotate-180"
          )} />
        </button>

        {/* Выпадающее меню */}
        {showMenu && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="flex items-center gap-3 px-4 py-3 hover:bg-[#27272A] cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-[#8cf425]" />
              <span className="text-sm text-[#E4E4E7]">Загрузить файлы</span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS.join(',')}
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={disabled}
              />
            </label>

            {showHistoryButton && onSelectFromHistory && (
              <button 
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#27272A] w-full text-left transition-colors"
                onClick={handleSelectFromHistoryClick}
                disabled={disabled}
              >
                <History className="w-4 h-4 text-[#A855F7]" />
                <span className="text-sm text-[#E4E4E7]">Из сгенерированных</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Превью загруженных изображений */}
      {images.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div className={cn(
                "w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                img.status === 'ready' ? "border-[#8cf425]" : "border-[#3F3F46]"
              )}>
                {img.status === 'uploading' ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#27272A]">
                    <Loader2 className="w-6 h-6 text-[#8cf425] animate-spin" />
                  </div>
                ) : img.status === 'error' ? (
                  <div className="w-full h-full flex items-center justify-center bg-red-500/10">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                ) : (
                  <img
                    src={img.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {img.status === 'ready' && (
                <button
                  onClick={() => removeImage(img.id)}
                  disabled={disabled}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Индикатор источника */}
              {img.source === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                  <History className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Подсказка */}
      {images.length === 0 && !showMenu && (
        <p className="text-xs text-[#52525B] mt-2 text-center">
          PNG, JPG, WEBP • До 10MB • Макс {maxImages} изображений
        </p>
      )}
    </div>
  );
}

