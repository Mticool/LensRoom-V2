'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, X, ZoomIn, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../config';

// Add custom animation styles
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  .animate-spin-slow {
    animation: spin-slow 3s linear infinite;
  }
`;

interface GalleryViewProps {
  messages: ChatMessage[];
  onDownload: (url: string, type: string) => void;
  onCopy: (url: string) => void;
  modelFilter?: string; // Фильтр по модели (например, только Nano Banana Pro)
  isGenerating?: boolean; // Идет ли генерация
  generatingCount?: number; // Количество генерируемых изображений
}

interface GalleryItem {
  id: number;
  url: string;
  prompt: string;
  model: string;
  type: string;
  timestamp?: Date | string;
  aspectRatio?: string;
}

// Helper to get CSS aspect ratio class
const getAspectRatioClass = (ratio?: string) => {
  const ratioMap: Record<string, string> = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '4:3': 'aspect-[4/3]',
    '3:4': 'aspect-[3/4]',
    '21:9': 'aspect-[21/9]',
    '3:2': 'aspect-[3/2]',
    '2:3': 'aspect-[2/3]',
    '4:5': 'aspect-[4/5]',
    '5:4': 'aspect-[5/4]',
  };
  return ratioMap[ratio || '1:1'] || 'aspect-square';
};

export function GalleryView({ 
  messages, 
  onDownload, 
  onCopy,
  modelFilter,
  isGenerating = false,
  generatingCount = 0
}: GalleryViewProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, boolean>>({});

  // Извлекаем все результаты из сообщений
  const galleryItems: GalleryItem[] = messages
    .filter(m => m.role === 'assistant' && (m.url || m.urls))
    .filter(m => !modelFilter || m.model === modelFilter) // Фильтр по модели
    .flatMap(message => {
      const urls = message.urls || (message.url ? [message.url] : []);
      // Найти ПОСЛЕДНЕЕ user-сообщение перед этим assistant-сообщением
      const userMessages = messages.filter(m => m.role === 'user' && m.id < message.id);
      const userMessage = userMessages[userMessages.length - 1]; // Берём последнее
      const prompt = userMessage?.content || message.content || 'Без промпта';
      
      return urls.map((url, idx) => {
        const ratio = (message as any).aspectRatio || '1:1';
        console.log('[GalleryView] Message aspectRatio:', ratio, 'Message:', message);
        return {
          id: message.id * 1000 + idx,
          url,
          prompt,
          model: message.model || 'Unknown',
          type: message.type || 'image',
          timestamp: message.timestamp,
          aspectRatio: ratio,
        };
      });
    });

  const handleImageLoad = (url: string) => {
    setImageLoadStates(prev => ({ ...prev, [url]: true }));
  };

  // Show empty state only if not generating and no items
  if (galleryItems.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
            Галерея пуста
          </h3>
          <p className="text-[var(--muted)] text-sm">
            {modelFilter 
              ? `Создайте несколько изображений с помощью ${modelFilter}, и они появятся здесь в удобной галерее.`
              : 'Создайте несколько изображений, и они появятся здесь в удобной галерее.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Add animation styles */}
      <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
      
      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Generating Placeholders */}
          {isGenerating && Array.from({ length: generatingCount }).map((_, idx) => (
            <motion.div
              key={`generating-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-square" // Placeholders always square for now
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-[var(--surface)] border border-cyan-500/40">
                {/* Animated Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 animate-pulse" />
                
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                
                {/* Generating Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-500/20 flex items-center justify-center animate-spin-slow">
                      <Maximize2 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="text-xs text-cyan-400 font-medium">Генерация...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Actual Gallery Items */}
          {galleryItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "group relative cursor-pointer",
                getAspectRatioClass(item.aspectRatio)
              )}
              onClick={() => setSelectedItem(item)}
            >
              {/* Image Container */}
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                {item.type === 'video' ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover"
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                  />
                ) : (
                  <>
                    {/* Skeleton loader */}
                    {!imageLoadStates[item.url] && (
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[var(--surface)] via-[var(--accent-subtle)] to-[var(--surface)]" />
                    )}
                    <img 
                      src={item.url} 
                      alt={item.prompt}
                      className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        imageLoadStates[item.url] ? "opacity-100" : "opacity-0"
                      )}
                      loading="lazy"
                      onLoad={() => handleImageLoad(item.url)}
                    />
                  </>
                )}
                
                {/* Hover Overlay with Prompt */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                  <p className="text-white text-xs line-clamp-3 mb-2">
                    {item.prompt}
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(item.url, item.type);
                      }}
                      className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                      title="Скачать"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(item.url);
                      }}
                      className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all"
                      title="Копировать"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all ml-auto"
                      title="Увеличить"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Model Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium text-white">{item.model}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl max-h-[90vh] flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image/Video */}
              <div className="relative flex items-center justify-center">
                {selectedItem.type === 'video' ? (
                  <video 
                    src={selectedItem.url} 
                    controls 
                    autoPlay
                    className="max-w-full max-h-[70vh] rounded-lg"
                  />
                ) : (
                  <img 
                    src={selectedItem.url} 
                    alt={selectedItem.prompt}
                    className="max-w-full max-h-[70vh] rounded-lg object-contain"
                  />
                )}
              </div>

              {/* Info & Actions */}
              <div className="bg-white/5 backdrop-blur-xl rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-white/60">Модель:</span>
                      <span className="text-sm font-semibold text-white">{selectedItem.model}</span>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {selectedItem.prompt}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => onDownload(selectedItem.url, selectedItem.type)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Скачать</span>
                  </button>
                  <button
                    onClick={() => onCopy(selectedItem.url)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm font-medium">Копировать ссылку</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
