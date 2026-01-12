'use client';

import { forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Download, Copy, ThumbsUp, RotateCcw, Shuffle, Wand2, Palette, Maximize2, Lightbulb, Video, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, SectionType, ModelInfo } from '../config';

interface ChatMessagesProps {
  messages: ChatMessage[];
  activeSection: SectionType;
  modelInfo: ModelInfo | undefined;
  onSetPrompt: (prompt: string) => void;
  onDownload: (url: string, type: string) => void;
  onCopy: (url: string) => void;
  onRegenerate: (prompt: string) => void;
  onQuickAction?: (action: string, originalPrompt: string, url: string) => void;
  onFileUpload?: (files: File[]) => void;
  uploadedFiles?: File[];
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(({
  messages,
  activeSection,
  modelInfo,
  onSetPrompt,
  onDownload,
  onCopy,
  onRegenerate,
  onQuickAction,
  onFileUpload,
  uploadedFiles = [],
}, ref) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Get original prompt for a message
  const getOriginalPrompt = (messageId: number) => {
    const idx = messages.findIndex(m => m.id === messageId);
    const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
    return userMsg?.content || '';
  };
  // Special empty state for Motion Control - Higgsfield style with working uploads
  if (messages.length === 0 && modelInfo?.id === 'kling-motion-control') {
    const videoFile = uploadedFiles.find(f => f.type.startsWith('video/'));
    const imageFile = uploadedFiles.find(f => f.type.startsWith('image/'));
    const hasVideo = !!videoFile;
    const hasImage = !!imageFile;
    
    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileUpload) {
        const newFiles = uploadedFiles.filter(f => !f.type.startsWith('video/'));
        onFileUpload([...newFiles, file]);
      }
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileUpload) {
        const newFiles = uploadedFiles.filter(f => !f.type.startsWith('image/'));
        onFileUpload([...newFiles, file]);
      }
    };
    
    const removeVideo = () => {
      if (onFileUpload) {
        onFileUpload(uploadedFiles.filter(f => !f.type.startsWith('video/')));
      }
    };
    
    const removeImage = () => {
      if (onFileUpload) {
        onFileUpload(uploadedFiles.filter(f => !f.type.startsWith('image/')));
      }
    };
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        {/* Hidden file inputs */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--text)]">
            Загрузите референсы
          </h1>
        </div>
        
        {/* Upload Cards - Higgsfield style */}
        <div className="w-full max-w-2xl p-6 rounded-[24px] bg-[var(--surface)]/50 border border-[var(--border)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Video Card */}
            <div 
              onClick={() => !hasVideo && videoInputRef.current?.click()}
              className={cn(
                "group relative p-6 rounded-[20px] border transition-all duration-300",
                hasVideo 
                  ? "bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/50" 
                  : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--accent-secondary)]/50 cursor-pointer"
              )}
            >
              {hasVideo ? (
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 bg-black">
                    <video 
                      src={URL.createObjectURL(videoFile)} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeVideo(); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-[13px] text-[var(--accent-secondary)] font-medium">✓ Видео загружено</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">{videoFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--surface3)] flex items-center justify-center mb-3 group-hover:bg-[var(--accent-secondary)]/10 transition-all">
                    <Video className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--accent-secondary)] transition-colors" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">Загрузить видео</h3>
                  <p className="text-[12px] text-[var(--muted)]">
                    Референс с движениями
                  </p>
                  <p className="text-[11px] text-[var(--muted-light)] mt-1">3-30 сек</p>
                </div>
              )}
            </div>
            
            {/* Add Character Image Card */}
            <div 
              onClick={() => !hasImage && imageInputRef.current?.click()}
              className={cn(
                "group relative p-6 rounded-[20px] border transition-all duration-300",
                hasImage 
                  ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/50" 
                  : "bg-[var(--surface2)] border-[var(--border)] hover:border-[var(--accent-primary)]/50 cursor-pointer"
              )}
            >
              {hasImage ? (
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 max-w-[140px]">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Character"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-[13px] text-[var(--accent-primary)] font-medium">✓ Фото загружено</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">{imageFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--surface3)] flex items-center justify-center mb-3 group-hover:bg-[var(--accent-primary)]/10 transition-all">
                    <ImagePlus className="w-6 h-6 text-[var(--muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">Добавить персонажа</h3>
                  <p className="text-[12px] text-[var(--muted)]">
                    Фото для анимации
                  </p>
                  <p className="text-[11px] text-[var(--muted-light)] mt-1">PNG, JPG</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Step indicator */}
          <div className="flex justify-center mt-6">
            <div className={cn(
              "px-4 py-1.5 rounded-full border",
              hasVideo && hasImage 
                ? "bg-green-500/10 border-green-500/30" 
                : "bg-[var(--surface3)] border-[var(--border)]"
            )}>
              <span className={cn(
                "text-[12px] font-medium",
                hasVideo && hasImage ? "text-green-400" : "text-[var(--muted)]"
              )}>
                {hasVideo && hasImage 
                  ? "✓ Готово к генерации" 
                  : `Шаг 1 — ${!hasVideo && !hasImage ? 'Загрузите файлы' : !hasVideo ? 'Добавьте видео' : 'Добавьте фото'}`
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* Bottom tips */}
        <div className="mt-8 flex items-center justify-center gap-2 max-w-md mx-auto">
          <Lightbulb className="w-4 h-4 text-[var(--accent-secondary)] flex-shrink-0" />
          <p className="text-[13px] text-[var(--muted)]">
            Используйте плавные движения. Кадрирование фото и видео должно совпадать.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 rounded-[24px] bg-[var(--accent-primary)]/10 flex items-center justify-center mb-8 shadow-lg shadow-[var(--accent-primary)]/10">
          <Sparkles className="w-12 h-12 text-[var(--accent-primary)]" />
        </div>
        <h1 className="text-[32px] font-bold mb-4 text-[var(--text)] tracking-tight">
          Привет! Я {modelInfo?.name}
        </h1>
        <p className="text-[var(--muted)] text-[16px] mb-6 max-w-md leading-relaxed">
          Опишите что хотите создать, и я сгенерирую для вас{' '}
          {activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 max-w-md mx-auto">
          <Lightbulb className="w-4 h-4 text-[var(--accent-secondary)] flex-shrink-0" />
          <p className="text-[13px] text-[var(--muted)]">
            Совет: добавьте стиль, свет, фон и детали. Например: «студийная предметная съёмка, мягкий свет, белый фон».
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "flex gap-4",
            message.role === 'user' ? "flex-row-reverse" : ""
          )}
        >
          {/* Avatar - Premium */}
          <div className={cn(
            "w-10 h-10 rounded-[14px] flex-shrink-0 flex items-center justify-center shadow-lg",
            message.role === 'user' 
              ? "bg-[var(--surface3)] shadow-black/20" 
              : "bg-[var(--accent-primary)] shadow-[var(--accent-primary)]/20"
          )}>
            {message.role === 'user' ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Content */}
          <div className={cn(
            "flex-1 max-w-[80%]",
            message.role === 'user' ? "text-right" : ""
          )}>
            {message.role === 'user' ? (
              <div className="inline-block px-5 py-3.5 rounded-[18px] rounded-tr-[6px] bg-[var(--accent-subtle)] text-[var(--text)] text-[15px] leading-relaxed">
                {message.content}
              </div>
            ) : (
              <div className="space-y-4">
                {message.isGenerating ? (
                  <div className="relative p-6 rounded-[20px] rounded-tl-[6px] bg-gradient-to-br from-[var(--surface)] to-[var(--surface2)] border border-[var(--border)] overflow-hidden">
                    {/* Animated gradient background */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/20 via-transparent to-[var(--accent-primary)]/20 animate-gradient" />
                    </div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-black animate-pulse" />
                          </div>
                          {/* Spinning ring */}
                          <div className="absolute -inset-1 rounded-xl border-2 border-transparent border-t-[var(--accent-primary)] animate-spin" />
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-[var(--text)]">Создаю {message.type === 'video' ? 'видео' : message.type === 'audio' ? 'аудио' : 'изображение'}</div>
                          <div className="text-[12px] text-[var(--muted)]">{message.model}</div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full bg-[var(--surface3)] overflow-hidden">
                        <motion.div 
                          className="h-full bg-[var(--accent-primary)] rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: message.type === 'video' ? 60 : 30, ease: 'linear' }}
                        />
                      </div>
                      
                      {/* Status text */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[12px] text-[var(--muted)]">
                          {message.type === 'video' ? 'Обычно 30-60 секунд' : message.type === 'audio' ? 'Обычно 20-40 секунд' : 'Обычно 10-30 секунд'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[12px] text-emerald-400">В процессе</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Batch Results Grid - Premium */}
                    {message.batchResults && message.batchResults.length > 0 && (
                      <div className="space-y-4">
                        <div className="px-5 py-3.5 rounded-[18px] rounded-tl-[6px] bg-[var(--surface)] text-[var(--text)] text-[15px]">
                          {message.content}
                        </div>
                        <div className={cn(
                          "grid gap-3",
                          message.batchResults.length === 1 ? "grid-cols-1" :
                          message.batchResults.length === 2 ? "grid-cols-2" :
                          message.batchResults.length <= 4 ? "grid-cols-2" :
                          message.batchResults.length <= 6 ? "grid-cols-3" :
                          "grid-cols-4"
                        )}>
                          {message.batchResults.map((result, idx) => (
                            <div key={idx} className="relative group rounded-[16px] overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                              <img 
                                src={result.url} 
                                alt={`Batch result ${idx + 1}`}
                                className="w-full h-auto object-cover"
                              />
                              {/* Hover actions - Premium */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center gap-3 p-4">
                                <button
                                  onClick={() => onDownload(result.url, 'image')}
                                  className="p-2.5 rounded-[12px] bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all"
                                  title="Скачать"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onCopy(result.url)}
                                  className="p-2.5 rounded-[12px] bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all"
                                  title="Копировать ссылку"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Variants Grid - Multiple images from parallel requests */}
                    {message.urls && message.urls.length > 1 && (
                      <div className="space-y-4">
                        <div className="px-5 py-3.5 rounded-[18px] rounded-tl-[6px] bg-[var(--surface)] text-[var(--text)] text-[15px]">
                          {message.content}
                        </div>
                        <div className={cn(
                          "grid gap-3",
                          message.urls.length === 2 ? "grid-cols-2" : "grid-cols-2"
                        )}>
                          {message.urls.map((url, idx) => (
                            <div key={idx} className="relative group rounded-[16px] overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                              <img 
                                src={url} 
                                alt={`Вариант ${idx + 1}`}
                                className="w-full h-auto object-cover"
                              />
                              {/* Hover actions */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center gap-3 p-4">
                                <button
                                  onClick={() => onDownload(url, 'image')}
                                  className="p-2.5 rounded-[12px] bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all"
                                  title="Скачать"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onCopy(url)}
                                  className="p-2.5 rounded-[12px] bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all"
                                  title="Копировать ссылку"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              {/* Variant number badge */}
                              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                                <span className="text-[11px] font-medium text-white">{idx + 1}/{message.urls!.length}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Result Media (single) - Premium */}
                    {message.url && !message.batchResults && (!message.urls || message.urls.length <= 1) && (
                      <div className="rounded-[18px] rounded-tl-[6px] overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                        {message.type === 'video' ? (
                          <video 
                            src={message.url} 
                            controls 
                            className="w-full max-h-[450px] object-contain"
                          />
                        ) : message.type === 'audio' ? (
                          <audio 
                            src={message.url} 
                            controls 
                            className="w-full p-5"
                          />
                        ) : (
                          <img 
                            src={message.url} 
                            alt=""
                            className="w-full max-h-[450px] object-contain"
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Text content */}
                    {message.content && !message.url && (
                      <div className="px-5 py-3.5 rounded-[18px] rounded-tl-[6px] bg-[var(--surface)] text-[var(--text)] text-[15px]">
                        {message.content}
                      </div>
                    )}

                    {/* Actions - Premium */}
                    <div className="flex items-center gap-1.5 ml-1 mt-1">
                      {message.url && (
                        <button
                          onClick={() => onDownload(message.url!, message.type || 'image')}
                          className="p-2.5 rounded-[10px] text-[var(--muted)] hover:text-emerald-400 hover:bg-emerald-400/10 transition-all duration-200"
                          title="Скачать"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {message.url && (
                        <button 
                          onClick={() => onCopy(message.url!)}
                          className="p-2.5 rounded-[10px] text-[var(--muted)] hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-200"
                          title="Копировать ссылку"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        className="p-2.5 rounded-[10px] text-[var(--muted)] hover:text-pink-400 hover:bg-pink-400/10 transition-all duration-200"
                        title="Нравится"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const prompt = getOriginalPrompt(message.id);
                          if (prompt) onRegenerate(prompt);
                        }}
                        className="p-2.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-subtle)] transition-all duration-200"
                        title="Повторить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span className="text-[12px] text-[var(--muted)] ml-2 font-medium">
                        {message.model}
                      </span>
                    </div>

                    {/* Quick Actions - Premium */}
                    {message.url && message.type !== 'audio' && onQuickAction && (
                      <div className="flex flex-wrap gap-2 mt-4 ml-1">
                        <button
                          onClick={() => onQuickAction('variations', getOriginalPrompt(message.id), message.url!)}
                          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-[12px] font-medium text-[var(--muted-light)] hover:text-[var(--text)] hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/10 transition-all duration-200"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          Вариации
                        </button>
                        <button
                          onClick={() => onQuickAction('enhance', getOriginalPrompt(message.id), message.url!)}
                          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-[12px] font-medium text-[var(--muted-light)] hover:text-[var(--text)] hover:border-[#22d3ee]/40 hover:bg-[#22d3ee]/10 transition-all duration-200"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          Улучшить
                        </button>
                        <button
                          onClick={() => onQuickAction('style', getOriginalPrompt(message.id), message.url!)}
                          className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-[12px] font-medium text-[var(--muted-light)] hover:text-[var(--text)] hover:border-[#f472b6]/40 hover:bg-[#f472b6]/10 transition-all duration-200"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          Изменить стиль
                        </button>
                        {message.type === 'image' && (
                          <button
                            onClick={() => onQuickAction('resize', getOriginalPrompt(message.id), message.url!)}
                            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-[12px] font-medium text-[var(--muted-light)] hover:text-[var(--text)] hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-all duration-200"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Другой размер
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
      <div ref={ref} />
    </div>
  );
});

ChatMessages.displayName = 'ChatMessages';
