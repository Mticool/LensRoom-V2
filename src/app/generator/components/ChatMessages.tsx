'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Download, Copy, ThumbsUp, RotateCcw, Shuffle, Wand2, Palette, Maximize2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, SectionType, ModelInfo, QUICK_PROMPTS } from '../config';
import { PromptTemplates } from '@/components/generator/PromptTemplates';

interface ChatMessagesProps {
  messages: ChatMessage[];
  activeSection: SectionType;
  modelInfo: ModelInfo | undefined;
  onSetPrompt: (prompt: string) => void;
  onDownload: (url: string, type: string) => void;
  onCopy: (url: string) => void;
  onRegenerate: (prompt: string) => void;
  onQuickAction?: (action: string, originalPrompt: string, url: string) => void;
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
}, ref) => {
  // Get original prompt for a message
  const getOriginalPrompt = (messageId: number) => {
    const idx = messages.findIndex(m => m.id === messageId);
    const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
    return userMsg?.content || '';
  };
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-[#a78bfa]/20 to-[#22d3ee]/20 flex items-center justify-center mb-8 shadow-lg shadow-[#a78bfa]/10">
          <Sparkles className="w-12 h-12 text-[var(--accent-primary)]" />
        </div>
        <h1 className="text-[32px] font-bold mb-4 text-[var(--text)] tracking-tight">
          Привет! Я {modelInfo?.name}
        </h1>
        <p className="text-[var(--muted)] text-[16px] mb-6 max-w-md leading-relaxed">
          Опишите что хотите создать, и я сгенерирую для вас{' '}
          {activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}
        </p>

        {/* Prompt Templates */}
        <div className="mb-8 w-full max-w-xl">
          <PromptTemplates 
            type={activeSection} 
            onSelectPrompt={onSetPrompt}
            isCollapsed={false}
          />
        </div>
        
        {/* Quick prompts - Premium */}
        <div className="flex flex-wrap gap-2.5 justify-center max-w-xl">
          {QUICK_PROMPTS[activeSection].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSetPrompt(suggestion)}
              className="px-5 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] text-[13px] font-medium text-[var(--muted-light)] hover:text-[var(--text)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--accent-subtle)] transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
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
              ? "bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] shadow-[#a78bfa]/20" 
              : "bg-gradient-to-br from-[#22d3ee] to-[#a78bfa] shadow-[#22d3ee]/20"
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
                  <div className="flex items-center gap-4 px-5 py-4 rounded-[18px] rounded-tl-[6px] bg-[var(--surface)]">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 bg-[#22d3ee] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 bg-[#f472b6] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[14px] text-[var(--muted)]">
                      Генерирую с {message.model}...
                    </span>
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

                    {/* Result Media (single) - Premium */}
                    {message.url && !message.batchResults && (
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

