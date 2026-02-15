'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { ImagePlus, Film, X, AlertTriangle } from 'lucide-react';

export type UploadZoneType = 'video' | 'image';

const MAX_VIDEO_SIZE_MB = 100;
const MAX_IMAGE_SIZE_MB = 10;
const MIN_IMAGE_PX = 300;
const VALID_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateVideoFile(file: File): string | null {
  if (!VALID_VIDEO_TYPES.includes(file.type)) {
    return 'Неподдерживаемый формат. Используйте MP4, MOV или WebM';
  }
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Видео слишком большое (${Math.round(file.size / 1024 / 1024)} МБ). Макс. ${MAX_VIDEO_SIZE_MB} МБ`;
  }
  return null;
}

function validateImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      resolve('Неподдерживаемый формат. Используйте JPG, PNG или WebP');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      resolve(`Изображение слишком большое (${Math.round(file.size / 1024 / 1024)} МБ). Макс. ${MAX_IMAGE_SIZE_MB} МБ`);
      return;
    }
    // Check image dimensions
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth < MIN_IMAGE_PX || img.naturalHeight < MIN_IMAGE_PX) {
        resolve(`Изображение слишком маленькое (${img.naturalWidth}×${img.naturalHeight}). Мин. ${MIN_IMAGE_PX}×${MIN_IMAGE_PX} px`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('Не удалось прочитать изображение');
    };
    img.src = url;
  });
}

interface MotionUploadZoneProps {
  type: UploadZoneType;
  file: File | null;
  onChange: (file: File | null) => void;
  title: string;
  subtitle?: string;
  /** Duration in seconds — shown for video uploads */
  durationSec?: number | null;
  accept?: string;
  disabled?: boolean;
  /** External validation error (e.g. duration too long) */
  validationError?: string | null;
}

export function MotionUploadZone({
  type,
  file,
  onChange,
  title,
  subtitle,
  durationSec,
  accept,
  disabled,
  validationError,
}: MotionUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!file || type !== 'image') return null;
    return URL.createObjectURL(file);
  }, [file, type]);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    // Reset input so user can re-upload the same file
    if (inputRef.current) inputRef.current.value = '';

    if (!f) {
      onChange(null);
      setLocalError(null);
      return;
    }

    // Validate file before accepting
    let error: string | null = null;
    if (type === 'video') {
      error = validateVideoFile(f);
    } else {
      error = await validateImageFile(f);
    }

    if (error) {
      setLocalError(error);
      // Don't pass invalid file to parent
      return;
    }

    setLocalError(null);
    onChange(f);
  }, [type, onChange]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalError(null);
    onChange(null);
  };

  const Icon = type === 'video' ? Film : ImagePlus;
  const defaultAccept = type === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp';

  const hasFile = !!file;
  const displayError = localError || validationError;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-h-[140px]
          border-2 border-dashed transition-all duration-200 text-center
          ${displayError
            ? 'border-red-500/50 bg-red-500/5'
            : hasFile
              ? 'border-[#8cf425]/40 bg-[#8cf425]/5'
              : 'border-white/15 bg-white/[0.02] active:bg-white/[0.05]'
          }
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept || defaultAccept}
          className="hidden"
          onChange={handleFileChange}
        />

        {hasFile ? (
          <>
            {/* Filled state */}
            {type === 'image' && previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#8cf425]/10 flex items-center justify-center">
                <Film className="w-7 h-7 text-[#8cf425]" />
              </div>
            )}
            <div className="text-xs text-white/80 font-medium truncate max-w-full px-1">
              {file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}
            </div>
            {type === 'video' && typeof durationSec === 'number' && durationSec > 0 && (
              <div className="text-[11px] text-[#8cf425] font-semibold">
                {Math.round(durationSec)}s
              </div>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {/* Empty state */}
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white/40" />
            </div>
            <div className="text-xs font-semibold text-white/60">{title}</div>
            {subtitle && (
              <div className="text-[10px] text-white/30">{subtitle}</div>
            )}
          </>
        )}
      </button>

      {/* Error message */}
      {displayError && (
        <div className="flex items-start gap-1.5 px-1">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
          <span className="text-[11px] text-red-400 leading-tight">{displayError}</span>
        </div>
      )}
    </div>
  );
}
