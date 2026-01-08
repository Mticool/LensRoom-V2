'use client';

import { useCallback, useState, useRef } from 'react';
import { Upload, X, Video, Loader2, RefreshCw, Play } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  value: string | null;
  onChange: (videoData: string | null, durationSec?: number) => void;
  mode: 'compact' | 'prominent';
  className?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** External duration state (for display) */
  duration?: number | null;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (per KIE documentation)
const ACCEPTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];

export function VideoUploader({ 
  value, 
  onChange, 
  mode, 
  className, 
  disabled,
  label = 'Референсное видео',
  hint = 'MP4, MOV, MKV • 3-30 сек • До 100MB',
  duration: externalDuration,
}: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Поддерживаются только MP4, MOV, MKV, WEBM');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Файл слишком большой. Максимум 100MB');
      return;
    }

    setIsUploading(true);
    try {
      // Create object URL to check video duration
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(objectUrl);
        
        // Only validate minimum - max will be handled by auto-trim
        if (duration < 3) {
          toast.error('Видео слишком короткое. Минимум 3 секунды');
          setIsUploading(false);
          return;
        }
        
        // Show warning for long videos but allow (auto-trim will handle it)
        if (duration > 30) {
          toast.warning('Видео длиннее 30 сек — будет обрезано');
        }
        
        setVideoDuration(duration); // Keep exact duration, not rounded
        
        // Read file as data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          onChange(result, duration); // Pass duration to parent
          toast.success(`Видео загружено (${duration.toFixed(1)}с)`);
          setIsUploading(false);
        };
        reader.onerror = () => {
          toast.error('Ошибка чтения файла');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast.error('Ошибка обработки видео');
        setIsUploading(false);
      };
      
      video.src = objectUrl;
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
    onChange(null, undefined);
    setVideoDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  // Use external duration if provided (for synced state), fallback to local
  const displayDuration = externalDuration ?? videoDuration;

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
            {label}
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
            <video 
              ref={videoRef}
              src={value} 
              className="w-full h-20 object-cover"
              muted
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
            />
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white flex items-center gap-1">
              <Play className="w-2.5 h-2.5" />
              {displayDuration?.toFixed(1)}с
            </div>
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
                <Video className="w-4 h-4 text-[#71717A] mb-1" />
                <span className="text-[10px] text-[#71717A]">Загрузить видео</span>
              </>
            )}
          </label>
        )}
        
        {!value && (
          <p className="text-[9px] text-[#52525B] leading-tight">
            {hint}
          </p>
        )}
      </div>
    );
  }

  // Prominent mode - для главного Canvas
  return (
    <div className={cn("w-full", className)}>
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#27272A] group bg-[#18181B]">
          <div className="relative">
            <video 
              ref={videoRef}
              src={value} 
              className="w-full max-h-[300px] object-contain"
              controls
              muted
              playsInline
            />
            <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#00D9FF]" />
              Референс • {displayDuration?.toFixed(1)}с
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
                <span className="text-sm font-medium text-white">Референсное видео</span>
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
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[200px] flex flex-col items-center justify-center p-8 bg-[#18181B]/50",
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
                <div className="w-14 h-14 rounded-2xl bg-[#00D9FF]/20 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-[#00D9FF] animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Загрузка...</h3>
                  <p className="text-sm text-[#71717A]">Обрабатываем видео</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <Video className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {label}
                  </h3>
                  <p className="text-sm text-[#71717A] mb-3">
                    Загрузите видео с движениями для переноса
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    Выбрать видео
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#52525B]">
                  <span>MP4, MOV, MKV</span>
                  <span>•</span>
                  <span>3-30 сек</span>
                  <span>•</span>
                  <span>До 100MB</span>
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
