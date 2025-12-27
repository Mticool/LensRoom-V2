'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value: string | null;
  onChange: (imageData: string | null) => void;
  mode: 'compact' | 'prominent'; // compact - для сайдбара, prominent - для главного Canvas
  className?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function ImageUploader({ value, onChange, mode, className, disabled }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Поддерживаются только JPG, PNG, WEBP');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Файл слишком большой. Максимум 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onChange(result);
        toast.success('Изображение загружено');
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Ошибка чтения файла');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки');
      setIsUploading(false);
    }
  }, [onChange]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

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

    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [disabled, isUploading, handleFile]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // Compact mode - для сайдбара (текущий вид)
  if (mode === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">
            Референс
          </label>
          {value && (
            <button
              onClick={handleRemove}
              className="text-[10px] text-[#EF4444] hover:text-red-400 transition-colors"
              disabled={disabled || isUploading}
            >
              Удалить
            </button>
          )}
        </div>
        
        {value ? (
          <div className="relative rounded-lg overflow-hidden border border-[#27272A] group">
            <img 
              src={value} 
              alt="Reference" 
              className="w-full h-20 object-cover"
            />
            <button
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
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
            />
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-[#71717A] animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 text-[#71717A] mb-1" />
                <span className="text-[10px] text-[#71717A]">Загрузить</span>
              </>
            )}
          </label>
        )}
      </div>
    );
  }

  // Prominent mode - для главного Canvas (как у Syntx.ai)
  return (
    <div className={cn("w-full", className)}>
      {value ? (
        // Preview with actions
        <div className="relative rounded-2xl overflow-hidden border border-[#27272A] group bg-[#18181B]">
          <div className="relative">
            <img 
              src={value} 
              alt="Reference" 
              className="w-full max-h-[400px] object-contain"
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/20 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-[#00D9FF]" />
                  </div>
                  <span className="text-sm font-medium text-white">Референсное изображение</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Заменить
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={disabled || isUploading}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3 h-3" />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />
        </div>
      ) : (
        // Upload zone - большая заметная область
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
          />
          
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            {isUploading ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#00D9FF]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Загрузка...</h3>
                  <p className="text-sm text-[#71717A]">Обрабатываем изображение</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[#00D9FF]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-[#00D9FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {dragActive ? 'Отпустите для загрузки' : 'Загрузите изображение'}
                  </h3>
                  <p className="text-sm text-[#71717A] mb-4">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D9FF] text-[#0F0F10] text-sm font-medium hover:bg-[#22D3EE] transition-colors">
                    <Upload className="w-4 h-4" />
                    Выбрать файл
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#52525B]">
                  <span>PNG, JPG, WEBP</span>
                  <span>•</span>
                  <span>До 10MB</span>
                </div>
              </>
            )}
          </div>

          {/* Visual drag indicator */}
          {dragActive && (
            <div className="absolute inset-0 rounded-2xl bg-[#00D9FF]/5 pointer-events-none animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

