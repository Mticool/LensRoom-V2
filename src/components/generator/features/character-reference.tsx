'use client';

import { Upload, X, User, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ACCEPTED_IMAGE_FORMATS, processImageFile, createImagePreview } from '@/lib/image-utils';

interface CharacterReferenceProps {
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

export function CharacterReference({ onImagesChange, maxImages = 5 }: CharacterReferenceProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    try {
      setLoading(true);
      
      const processedFiles = await Promise.all(
        newFiles.map(file => processImageFile(file))
      );
      
      const totalFiles = [...files, ...processedFiles].slice(0, maxImages);
      setFiles(totalFiles);
      onImagesChange(totalFiles);

      const allPreviews = await Promise.all(
        totalFiles.map(file => createImagePreview(file))
      );
      setPreviews(allPreviews);
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    onImagesChange(newFiles);
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-[#c8ff00]" />
        Референсы персонажа
      </label>
      <p className="text-xs text-white/40 mb-3">
        До {maxImages} фото с разных ракурсов
      </p>

      <div className="grid grid-cols-5 gap-2">
        {previews.map((preview, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/20">
            <img src={preview} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-500 transition-colors"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </div>
        ))}

        {loading && (
          <div className="aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
          </div>
        )}

        {!loading && files.length < maxImages && (
          <label className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#c8ff00]/50 hover:bg-white/5 transition-all">
            <Upload className="w-4 h-4 text-white/40 mb-0.5" />
            <span className="text-[10px] text-white/40">Добавить</span>
            <input
              type="file"
              className="hidden"
              accept={ACCEPTED_IMAGE_FORMATS}
              multiple
              onChange={handleUpload}
            />
          </label>
        )}
      </div>
    </div>
  );
}

