'use client';

import { Upload, X, Film, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ACCEPTED_IMAGE_FORMATS, processImageFile, createImagePreview } from '@/lib/image-utils';

interface FirstLastFrameProps {
  onFirstFrameChange: (file: File | null) => void;
  onLastFrameChange: (file: File | null) => void;
}

export function FirstLastFrame({ onFirstFrameChange, onLastFrameChange }: FirstLastFrameProps) {
  const [firstPreview, setFirstPreview] = useState<string | null>(null);
  const [lastPreview, setLastPreview] = useState<string | null>(null);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void,
    setLoading: (loading: boolean) => void,
    onChange: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const processedFile = await processImageFile(file);
      const preview = await createImagePreview(processedFile);
      setPreview(preview);
      onChange(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (
    setPreview: (url: string | null) => void,
    onChange: (file: File | null) => void
  ) => {
    setPreview(null);
    onChange(null);
  };

  const renderFrame = (
    preview: string | null,
    loading: boolean,
    setPreview: (url: string | null) => void,
    setLoading: (loading: boolean) => void,
    onChange: (file: File | null) => void,
    label: string
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center aspect-video rounded-lg border border-white/10 bg-white/5">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      );
    }

    if (preview) {
      return (
        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20">
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={() => handleRemove(setPreview, onChange)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white">
            {label}
          </span>
        </div>
      );
    }

    return (
      <label className="flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-white/20 cursor-pointer hover:border-[#c8ff00]/50 hover:bg-white/5 transition-all">
        <Upload className="w-4 h-4 text-white/40 mb-1" />
        <span className="text-[10px] text-white/40">{label}</span>
        <input
          type="file"
          className="hidden"
          accept={ACCEPTED_IMAGE_FORMATS}
          onChange={(e) => handleUpload(e, setPreview, setLoading, onChange)}
        />
      </label>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
        <Film className="w-4 h-4 text-[#c8ff00]" />
        Первый / Последний кадр
      </label>
      <p className="text-xs text-white/40 mb-3">
        Задайте начальный и конечный кадры
      </p>

      <div className="grid grid-cols-2 gap-3">
        {renderFrame(firstPreview, loadingFirst, setFirstPreview, setLoadingFirst, onFirstFrameChange, 'Начало')}
        {renderFrame(lastPreview, loadingLast, setLastPreview, setLoadingLast, onLastFrameChange, 'Конец')}
      </div>
    </div>
  );
}

