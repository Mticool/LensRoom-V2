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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text)]">
        Изображение персонажа
      </label>
      
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all",
          preview ? "border-[var(--border)]" : "border-[var(--border)] hover:border-[var(--gold)]/50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !preview && "cursor-pointer"
        )}
      >
        {preview ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="image-upload"
            className={cn(
              "flex flex-col items-center justify-center py-12 px-6",
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
                <div className="w-12 h-12 border-4 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--muted)]">Загрузка...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[var(--surface2)] flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-[var(--gold)]" />
                </div>
                <p className="text-sm font-medium text-[var(--text)] mb-1">
                  Перетащите изображение или нажмите для выбора
                </p>
                <p className="text-xs text-[var(--muted)]">
                  JPG, PNG, WEBP до 10MB
                </p>
              </>
            )}
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
