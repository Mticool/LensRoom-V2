'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionType, ModelInfo } from '../config';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  uploadedFiles: File[];
  onFilesChange: (files: File[]) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  activeSection: SectionType;
  modelInfo: ModelInfo | undefined;
  currentCost: number;
  hasMessages: boolean;
  onClearChat: () => void;
}

export function PromptInput({
  prompt,
  onPromptChange,
  uploadedFiles,
  onFilesChange,
  isGenerating,
  onGenerate,
  activeSection,
  modelInfo,
  currentCost,
  hasMessages,
  onClearChat,
}: PromptInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = activeSection === 'video' ? 2 : 4;
    if (uploadedFiles.length + files.length <= maxFiles) {
      onFilesChange([...uploadedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(uploadedFiles.filter((_, i) => i !== index));
  };

  const getAcceptTypes = () => {
    switch (activeSection) {
      case 'image': return 'image/*';
      case 'video': return 'video/*,image/*';
      case 'audio': return 'audio/*';
    }
  };

  const getPlaceholder = () => {
    switch (activeSection) {
      case 'image': return 'Опишите изображение...';
      case 'video': return 'Опишите видео...';
      case 'audio': return 'Опишите музыку или песню...';
    }
  };

  return (
    <div className="border-t border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        {/* File Previews */}
        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 mb-3"
            >
              {uploadedFiles.map((file, i) => (
                <div key={i} className="relative group">
                  <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-gray-500 text-center px-1">{file.name.slice(0, 8)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex items-end gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple={activeSection !== 'video'}
            className="hidden"
            accept={getAcceptTypes()}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon p-2 rounded-xl text-gray-400 hover:text-cyan-400 flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <textarea
            value={prompt}
            onChange={(e) => {
              onPromptChange(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onGenerate();
              }
            }}
            placeholder={getPlaceholder()}
            rows={1}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-600 resize-none max-h-[150px] py-2"
          />
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500 hidden sm:block">{currentCost}⭐</span>
            
            <button
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "btn-glow p-2.5 rounded-xl",
                prompt.trim() && !isGenerating
                  ? "bg-gradient-to-r from-purple-500 to-cyan-500 shadow-lg shadow-purple-500/25 text-white"
                  : "bg-white/10 text-gray-600 cursor-not-allowed"
              )}
            >
              <Send className={cn("w-4 h-4 transition-transform", isGenerating && "animate-pulse")} />
            </button>
          </div>
        </div>
        
        {/* Bottom info */}
        <div className="flex items-center justify-between mt-2 px-2">
          <span className="text-xs text-gray-600">
            {modelInfo?.name} • {currentCost}⭐ за генерацию
          </span>
          {hasMessages && (
            <button 
              onClick={onClearChat}
              className="text-xs text-gray-600 hover:text-red-400 transition"
            >
              Очистить чат
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

