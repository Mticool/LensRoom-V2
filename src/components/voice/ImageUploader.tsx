'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  maxSize?: number; // в байтах
  disabled?: boolean;
  compact?: boolean;
}

export function ImageUploader({ 
  onImageUploaded, 
  maxSize = 10485760, // 10MB
  disabled = false,
  compact = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    // Валидация размера
    if (file.size > maxSize) {
      const sizeMB = maxSize / 1024 / 1024;
      setError(`Файл слишком большой. Максимум ${sizeMB}MB`);
      toast.error(`Файл слишком большой. Максимум ${sizeMB}MB`);
      return;
    }

    // Валидация формата (проверяем и MIME-тип и расширение файла)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');
    const hasValidMimeType = allowedTypes.includes(file.type);

    if (!hasValidMimeType && !hasValidExtension) {
      setError('Поддерживаются только JPG, PNG, WEBP');
      toast.error('Поддерживаются только JPG, PNG, WEBP');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Показать preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Загрузить на сервер
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const response = await fetch('/api/upload/voice-assets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки');
      }

      const { url } = await response.json();
      onImageUploaded(url);
      toast.success('Изображение загружено');
    } catch (err: any) {
      const message = err?.message || 'Не удалось загрузить изображение';
      setError(message);
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [maxSize, onImageUploaded]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, uploading, handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onImageUploaded('');
  }, [onImageUploaded]);

  return (
    <div className={cn("rounded-3xl border border-[#242b37] bg-[#141821] shadow-[0_20px_60px_rgba(0,0,0,0.24)]", compact ? "p-4" : "p-5 sm:p-7")}>
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-3" : "mb-5")}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10", compact ? "h-9 w-9" : "h-11 w-11")}>
              <ImageIcon className={cn("text-[var(--gold)]", compact ? "h-4 w-4" : "h-5 w-5")} />
            </div>
            <div className="min-w-0">
              <div className={cn("font-semibold text-[#f4f6f8]", compact ? "text-sm" : "text-lg")}>Фото</div>
              <div className={cn("text-[#9ea8b8]", compact ? "text-xs" : "text-sm")}>Чем четче лицо, тем лучше</div>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs text-[#9ea8b8]">До 10MB</div>
      </div>

      {compact && (
        <div className="mb-3 h-[52px] rounded-2xl border border-[#2a3341] bg-[#0f1219]" />
      )}
      
      <div
        onDrop={handleDrop}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed transition-all",
          preview ? "border-[#2a3341]" : "border-[#2a3341] hover:border-[var(--gold)]/45",
          isDragOver && "border-[var(--drag-over-border)] bg-[var(--drag-over-bg)]",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !preview && "cursor-pointer"
        )}
      >
        {preview ? (
          <div className={cn("relative bg-black/50", compact ? "aspect-[4/5]" : "aspect-video")}>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute top-3 right-3 p-2 rounded-xl bg-[var(--error)]/90 text-white hover:bg-[var(--error)] transition-colors shadow-sm"
                title="Удалить изображение"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="image-upload"
            className={cn(
              "flex flex-col items-center justify-center px-4 text-center",
              compact ? "py-6" : "py-10",
              !disabled && "cursor-pointer"
            )}
          >
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
              disabled={disabled || uploading}
              className="hidden"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--gold)]/25 border-t-[var(--gold)]" />
                <p className="text-sm text-[#9ea8b8]">Загрузка...</p>
              </div>
            ) : (
              <>
                <div className={cn("flex items-center justify-center rounded-2xl border border-[#2a3341] bg-[#10141d]", compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4")}>
                  <Upload className={cn("text-[var(--gold)]", compact ? "h-4 w-4" : "h-6 w-6")} />
                </div>
                <p className={cn("mb-1 font-semibold text-[#f4f6f8]", compact ? "text-xs" : "text-sm")}>
                  Нажмите или перетащите
                </p>
                <p className={cn("text-[#9ea8b8]", compact ? "text-[10px]" : "text-xs")}>
                  JPG, PNG, WEBP
                </p>
              </>
            )}
          </label>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
