'use client';

import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ACCEPTED_IMAGE_FORMATS, processImageFile, createImagePreview } from '@/lib/image-utils';

interface ImageToImageProps {
  onImageChange: (file: File | null) => void;
}

export function ImageToImage({ onImageChange }: ImageToImageProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const processedFile = await processImageFile(file);
      const previewUrl = await createImagePreview(processedFile);
      setPreview(previewUrl);
      onImageChange(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-2">
        <ImageIcon className="w-4 h-4 text-[#c8ff00]" />
        Исходное изображение
      </label>
      <p className="text-xs text-white/40 mb-3">
        Загрузите фото для трансформации
      </p>

      {loading ? (
        <div className="flex items-center justify-center w-24 aspect-square rounded-lg border border-white/10 bg-white/5">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : preview ? (
        <div className="relative w-24 aspect-square rounded-lg overflow-hidden border border-white/20">
          <img src={preview} alt="Source" className="w-full h-full object-cover" />
          <button
            onClick={handleRemove}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-24 aspect-square rounded-lg border border-dashed border-white/20 cursor-pointer hover:border-[#c8ff00]/50 hover:bg-white/5 transition-all">
          <Upload className="w-5 h-5 text-white/40 mb-1" />
          <span className="text-[10px] text-white/40">Загрузить</span>
          <input type="file" className="hidden" accept={ACCEPTED_IMAGE_FORMATS} onChange={handleUpload} />
        </label>
      )}
    </div>
  );
}

