'use client';

import { useCallback, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface FrameUploadCardProps {
  label: string;
  optional?: boolean;
  file: File | null;
  preview?: string | null;
  onChange: (file: File | null) => void;
}

function FrameUploadCard({ label, optional, file, preview, onChange }: FrameUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Загрузите изображение');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Максимальный размер: 10 МБ');
      return;
    }

    onChange(selectedFile);
    toast.success('Изображение загружено');
  }, [onChange]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-2 p-3 cursor-pointer overflow-hidden relative"
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt={label} 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="text-center">
              <div className="text-xs text-white font-medium mb-0.5">{label}</div>
              <div className="text-[10px] text-zinc-500">
                {optional ? 'Optional' : 'Required'}
              </div>
            </div>
          </>
        )}
      </button>
    </div>
  );
}

interface FramesUploaderProps {
  startFrame: File | null;
  endFrame: File | null;
  startFramePreview?: string | null;
  endFramePreview?: string | null;
  onStartFrameChange: (file: File | null) => void;
  onEndFrameChange: (file: File | null) => void;
}

export function FramesUploader({ 
  startFrame, 
  endFrame,
  startFramePreview,
  endFramePreview,
  onStartFrameChange, 
  onEndFrameChange 
}: FramesUploaderProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FrameUploadCard
        label="Start frame"
        optional={true}
        file={startFrame}
        preview={startFramePreview}
        onChange={onStartFrameChange}
      />
      <FrameUploadCard
        label="End frame"
        optional={true}
        file={endFrame}
        preview={endFramePreview}
        onChange={onEndFrameChange}
      />
    </div>
  );
}
