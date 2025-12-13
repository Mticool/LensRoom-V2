"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ImageIcon, Download, Share2, Heart, ZoomIn, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { downloadImage, downloadMultipleImages } from "@/lib/download";
import { toast } from "sonner";
import type { GenerationResult } from "@/types/generator";

interface PreviewAreaProps {
  imageUrl?: string;
  isLoading?: boolean;
  selectedResult?: GenerationResult | null;
  results?: GenerationResult[];
}

export function PreviewArea({ 
  imageUrl, 
  isLoading = false,
  selectedResult,
  results = [],
}: PreviewAreaProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);

  const handleDownloadSingle = async () => {
    if (!imageUrl) return;
    
    setIsDownloading(true);
    try {
      const filename = selectedResult 
        ? `lensroom-${selectedResult.id}.png`
        : `lensroom-image-${Date.now()}.png`;
      await downloadImage(imageUrl, filename);
      toast.success("Изображение скачано! 📥");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ошибка скачивания";
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (results.length === 0) return;
    
    setIsDownloadingAll(true);
    toast.loading("Подготовка архива...", { id: "download-zip" });
    
    try {
      await downloadMultipleImages(results);
      toast.success(`${results.length} изображений скачано! 📦`, { id: "download-zip" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ошибка скачивания";
      toast.error(message, { id: "download-zip" });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview container */}
      <div
        className={cn(
          "flex-1 rounded-2xl",
          "flex items-center justify-center",
          "min-h-[400px] lg:min-h-[500px]",
          "relative overflow-hidden",
          imageUrl 
            ? "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)]"
            : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.10)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
        )}
      >
        {isLoading ? (
          <div className="text-center space-y-5 px-6">
            {/* Loading animation */}
            <div className="relative w-20 h-20 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-[rgba(245,200,66,0.30)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[var(--color-gold)]" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">
                Создаём изображение...
              </p>
              <p className="text-sm text-[rgba(255,255,255,0.55)]">
                10-30 секунд
              </p>
            </div>
          </div>
        ) : imageUrl ? (
          <div className="relative w-full h-full group">
            <img
              src={imageUrl}
              alt="Generated"
              className="w-full h-full object-contain"
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="bg-[rgba(255,255,255,0.15)] backdrop-blur border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.25)]"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="bg-[rgba(255,255,255,0.15)] backdrop-blur border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.25)]"
                  onClick={handleDownloadSingle}
                  disabled={isDownloading}
                >
                  <Download className="w-4 h-4 text-white" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="bg-[rgba(255,255,255,0.15)] backdrop-blur border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.25)]"
                >
                  <Share2 className="w-4 h-4 text-white" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="bg-[rgba(255,255,255,0.15)] backdrop-blur border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.25)]"
                >
                  <Heart className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 px-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.10)] flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-[rgba(255,255,255,0.40)]" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-semibold text-lg">
                Ваше изображение появится здесь
              </p>
              <p className="text-sm text-[rgba(255,255,255,0.55)] max-w-sm mx-auto">
                Введите промпт слева и нажмите «Создать»
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons (when image exists) */}
      {imageUrl && !isLoading && (
        <div className="flex gap-3 mt-4">
          <Button 
            variant="secondary" 
            className="flex-1"
            onClick={handleDownloadSingle}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Скачиваем...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </>
            )}
          </Button>

          {results.length > 1 && (
            <Button 
              variant="secondary"
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
            >
              {isDownloadingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Архивируем...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Все ({results.length})
                </>
              )}
            </Button>
          )}

          <Button variant="ghost" className="flex-1">
            <Sparkles className="w-4 h-4 mr-2" />
            Похожее
          </Button>
        </div>
      )}
    </div>
  );
}