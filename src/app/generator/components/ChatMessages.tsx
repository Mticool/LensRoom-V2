'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Download, Copy, ThumbsUp, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, SectionType, ModelInfo, QUICK_PROMPTS } from '../config';

interface ChatMessagesProps {
  messages: ChatMessage[];
  activeSection: SectionType;
  modelInfo: ModelInfo | undefined;
  onSetPrompt: (prompt: string) => void;
  onDownload: (url: string, type: string) => void;
  onCopy: (url: string) => void;
  onRegenerate: (prompt: string) => void;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(({
  messages,
  activeSection,
  modelInfo,
  onSetPrompt,
  onDownload,
  onCopy,
  onRegenerate,
}, ref) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3 text-[var(--text)]">
          Привет! Я {modelInfo?.name}
        </h1>
        <p className="text-gray-500 mb-8 max-w-md">
          Опишите что хотите создать, и я сгенерирую для вас{' '}
          {activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}
        </p>
        
        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {QUICK_PROMPTS[activeSection].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSetPrompt(suggestion)}
              className="btn-smooth px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-purple-500/30 hover:bg-purple-500/10"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex gap-4",
            message.role === 'user' ? "flex-row-reverse" : ""
          )}
        >
          {/* Avatar */}
          <div className={cn(
            "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
            message.role === 'user' 
              ? "bg-purple-500" 
              : "bg-gradient-to-br from-cyan-500 to-purple-500"
          )}>
            {message.role === 'user' ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Content */}
          <div className={cn(
            "flex-1 max-w-[80%]",
            message.role === 'user' ? "text-right" : ""
          )}>
            {message.role === 'user' ? (
              <div className="inline-block px-4 py-3 rounded-2xl rounded-tr-sm bg-purple-500/20 text-[var(--text)]">
                {message.content}
              </div>
            ) : (
              <div className="space-y-3">
                {message.isGenerating ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-400">
                      Генерирую с {message.model}...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Result Media */}
                    {message.url && (
                      <div className="rounded-2xl rounded-tl-sm overflow-hidden bg-white/5 border border-white/10">
                        {message.type === 'video' ? (
                          <video 
                            src={message.url} 
                            controls 
                            className="w-full max-h-[400px] object-contain"
                          />
                        ) : message.type === 'audio' ? (
                          <audio 
                            src={message.url} 
                            controls 
                            className="w-full p-4"
                          />
                        ) : (
                          <img 
                            src={message.url} 
                            alt=""
                            className="w-full max-h-[400px] object-contain"
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Text content */}
                    {message.content && !message.url && (
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 text-[var(--text)]">
                        {message.content}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-1">
                      {message.url && (
                        <button
                          onClick={() => onDownload(message.url!, message.type || 'image')}
                          className="btn-icon p-2 rounded-xl text-gray-500 hover:text-emerald-400"
                          title="Скачать"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {message.url && (
                        <button 
                          onClick={() => onCopy(message.url!)}
                          className="btn-icon p-2 rounded-xl text-gray-500 hover:text-blue-400"
                          title="Копировать ссылку"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        className="btn-icon p-2 rounded-xl text-gray-500 hover:text-pink-400"
                        title="Нравится"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const idx = messages.findIndex(m => m.id === message.id);
                          const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                          if (userMsg) onRegenerate(userMsg.content);
                        }}
                        className="btn-icon p-2 rounded-xl text-gray-500 hover:text-purple-400"
                        title="Повторить"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-600 ml-2">
                        {message.model}
                      </span>
                    </div>
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

