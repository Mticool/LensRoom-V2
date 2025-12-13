"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onUpload: (imageUrl: string) => void;
  currentImage: string | null;
  onRemove: () => void;
}

export function ImageUploader({
  onUpload,
  currentImage,
  onRemove,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate
      if (!file.type.startsWith("image/")) {
        toast.error("Пожалуйста, выберите изображение");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Размер файла не должен превышать 10MB");
        return;
      }

      try {
        setIsUploading(true);

        // Convert to base64 (в реальном проекте загрузите на сервер)
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          onUpload(result);
          toast.success("Изображение загружено! 🖼️");
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error("Ошибка загрузки изображения");
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <Card variant="glass" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Загрузить изображение
      </h3>

      {currentImage ? (
        <div className="relative group">
          <img src={currentImage} alt="Uploaded" className="w-full rounded-xl" />
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur border-white/20 hover:bg-black/70"
            onClick={onRemove}
          >
            <X className="w-4 h-4 mr-1" />
            Удалить
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
            isDragging
              ? "border-purple-500 bg-purple-500/10"
              : "border-border-primary hover:border-purple-500/50"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />

          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-purple-400" />
              )}
            </div>
            <div className="text-sm text-gray-300 mb-2">
              {isUploading
                ? "Загрузка..."
                : "Перетащите изображение или нажмите для выбора"}
            </div>
            <div className="text-xs text-gray-500">PNG, JPG до 10MB</div>
          </label>
        </div>
      )}
    </Card>
  );
}

