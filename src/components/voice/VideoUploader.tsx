'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoUploaderProps {
  onVideoUploaded: (url: string, duration?: number) => void;
  maxSize?: number; // в байтах
  maxDuration?: number; // в секундах (0 = без ограничения)
  disabled?: boolean;
}

export function VideoUploader({
  onVideoUploaded,
  maxSize = 104857600, // 100MB
  maxDuration = 30, // макс 30 секунд по KIE
  disabled = false,
}: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Валидация размера
    if (file.size > maxSize) {
      const sizeMB = maxSize / 1024 / 1024;
      setError(`Файл слишком большой. Максимум ${sizeMB}MB`);
      toast.error(`Файл слишком большой. Максимум ${sizeMB}MB`);
      return;
    }

    // Валидация формата
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm');
    const hasValidMimeType = allowedTypes.includes(file.type);

    if (!hasValidMimeType && !hasValidExtension) {
      setError('Поддерживаются только MP4, MOV, WEBM');
      toast.error('Поддерживаются только MP4, MOV, WEBM');
      return;
    }

    // Определить длительность перед загрузкой
    const videoDuration = await getVideoDuration(file);
    if (videoDuration !== null && maxDuration > 0 && videoDuration > maxDuration) {
      setError(`Видео слишком длинное. Максимум ${maxDuration} секунд, ваше: ${Math.ceil(videoDuration)}с`);
      toast.error(`Видео слишком длинное (${Math.ceil(videoDuration)}с). Максимум ${maxDuration}с`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Показать preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      if (videoDuration !== null) {
        setDuration(Math.ceil(videoDuration));
      }

      // Загрузить на сервер
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'video');

      const response = await fetch('/api/upload/voice-assets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки');
      }

      const { url } = await response.json();
      onVideoUploaded(url, videoDuration !== null ? Math.ceil(videoDuration) : undefined);
      toast.success('Видео загружено');
    } catch (err: any) {
      const message = err?.message || 'Не удалось загрузить видео';
      setError(message);
      toast.error(message);
      setPreview(null);
      setDuration(null);
    } finally {
      setUploading(false);
    }
  }, [maxSize, maxDuration, onVideoUploaded]);

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
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    setDuration(null);
    onVideoUploaded('');
  }, [preview, onVideoUploaded]);

  return (
    <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
              <Film className="w-5 h-5 text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text)]">Видео-референс</div>
              <div className="text-sm text-[var(--muted)]">
                {duration ? `${duration} сек` : 'Видео с движениями для переноса'}
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs text-[var(--muted)]">До {maxSize / 1024 / 1024}MB</div>
      </div>

      <div
        onDrop={handleDrop}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'relative rounded-2xl border border-dashed transition-all overflow-hidden',
          preview ? 'border-[var(--border)]' : 'border-[var(--border)] hover:border-violet-500/45',
          isDragOver && 'border-violet-500/60 bg-violet-500/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && !preview && 'cursor-pointer'
        )}
      >
        {preview ? (
          <div className="relative aspect-video bg-black/50">
            <video
              ref={videoRef}
              src={preview}
              className="w-full h-full object-contain"
              muted
              playsInline
              preload="metadata"
              controls
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute top-3 right-3 p-2 rounded-xl bg-[var(--error)]/90 text-white hover:bg-[var(--error)] transition-colors shadow-sm"
                title="Удалить видео"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            htmlFor="video-upload"
            className={cn(
              'flex flex-col items-center justify-center py-10 px-6 text-center',
              !disabled && 'cursor-pointer'
            )}
          >
            <input
              id="video-upload"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              onChange={handleFileInput}
              disabled={disabled || uploading}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-violet-500/25 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-sm text-[var(--muted)]">Загрузка...</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-[var(--text)] mb-1">
                  Перетащите видео или нажмите для выбора
                </p>
                <p className="text-xs text-[var(--muted)]">
                  MP4, MOV, WEBM • до {maxDuration > 0 ? `${maxDuration}с` : 'любой длины'}
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

/** Определить длительность видео-файла на клиенте */
function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const dur = video.duration;
        URL.revokeObjectURL(video.src);
        if (isFinite(dur) && dur > 0) {
          resolve(dur);
        } else {
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      // Таймаут на случай если видео не загрузится
      setTimeout(() => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }, 10000);

      video.src = URL.createObjectURL(file);
    } catch {
      resolve(null);
    }
  });
}
