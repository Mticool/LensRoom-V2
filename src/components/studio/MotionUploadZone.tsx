'use client';

import { useRef, useMemo } from 'react';
import { ImagePlus, Film, X, Upload } from 'lucide-react';

export type UploadZoneType = 'video' | 'image';

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
}: MotionUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!file || type !== 'image') return null;
    return URL.createObjectURL(file);
  }, [file, type]);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    onChange(f);
    // Reset input so user can re-upload the same file
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const Icon = type === 'video' ? Film : ImagePlus;
  const defaultAccept = type === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp';

  const hasFile = !!file;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-h-[140px]
        border-2 border-dashed transition-all duration-200 text-center
        ${hasFile
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
              onLoad={() => {
                // revoke handled on unmount or next change
              }}
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
  );
}
