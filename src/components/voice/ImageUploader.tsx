'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  maxSize?: number; // в байтах
  disabled?: boolean;
}

export function ImageUploader({ 
  onImageUploaded, 
  maxSize = 10485760, // 10MB
  disabled = false 
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
    <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text)]">Фото персонажа</div>
              <div className="text-sm text-[var(--muted)]">Чем четче лицо, тем лучше синхронизация</div>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs text-[var(--muted)]">До 10MB</div>
      </div>
      
      <div
        onDrop={handleDrop}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative rounded-2xl border border-dashed transition-all overflow-hidden",
          preview ? "border-[var(--border)]" : "border-[var(--border)] hover:border-[var(--gold)]/45",
          isDragOver && "border-[var(--drag-over-border)] bg-[var(--drag-over-bg)]",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !preview && "cursor-pointer"
        )}
      >
        {preview ? (
          <div className="relative aspect-video bg-black/50">
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
              "flex flex-col items-center justify-center py-10 px-6 text-center",
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
                <div className="w-12 h-12 border-4 border-[var(--gold)]/25 border-t-[var(--gold)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--muted)]">Загрузка...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-[var(--gold)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--text)] mb-1">
                  Перетащите изображение или нажмите для выбора
                </p>
                <p className="text-xs text-[var(--muted)]">
                  JPG, PNG, WEBP
                </p>
              </>
            )}
          </label>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
