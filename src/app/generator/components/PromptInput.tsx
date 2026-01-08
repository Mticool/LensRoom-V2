'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Send, Upload, Image as ImageIcon } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = useCallback((files: File[]) => {
    const maxFiles = activeSection === 'video' ? 2 : 4;
    const validFiles = files.filter(f => {
      if (activeSection === 'image') return f.type.startsWith('image/');
      if (activeSection === 'video') return f.type.startsWith('video/') || f.type.startsWith('image/');
      if (activeSection === 'audio') return f.type.startsWith('audio/');
      return false;
    });
    
    if (uploadedFiles.length + validFiles.length <= maxFiles) {
      onFilesChange([...uploadedFiles, ...validFiles]);
    }
  }, [activeSection, uploadedFiles, onFilesChange]);

  const removeFile = (index: number) => {
    onFilesChange(uploadedFiles.filter((_, i) => i !== index));
  };

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  const getAcceptTypes = () => {
    switch (activeSection) {
      case 'image': return 'image/*';
      case 'video': return 'video/*,image/*';
      case 'audio': return 'audio/*';
    }
  };

  const getPlaceholder = () => {
    switch (activeSection) {
      case 'image': return 'Опишите изображение или перетащите файл...';
      case 'video': return 'Опишите видео или перетащите файл...';
      case 'audio': return 'Опишите музыку или песню...';
    }
  };

  return (
    <div 
      className="border-t border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl p-3 md:p-4 relative pb-20 md:pb-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[var(--bg)]/95 backdrop-blur-sm flex items-center justify-center rounded-2xl border-2 border-dashed border-purple-500"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-lg font-medium text-[var(--text)]">Отпустите файл здесь</p>
              <p className="text-sm text-gray-500 mt-1">
                {activeSection === 'image' ? 'Изображение для референса' : 
                 activeSection === 'video' ? 'Изображение или видео' : 'Аудио файл'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    ) : file.type.startsWith('video/') ? (
                      <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
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

        {/* Drop zone hint - hidden on mobile for cleaner UI */}
        {uploadedFiles.length === 0 && activeSection !== 'audio' && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="hidden md:flex items-center gap-2 mb-3 p-3 rounded-xl border border-dashed border-white/10 cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/10 transition">
              <ImageIcon className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition">
                Перетащите {activeSection === 'image' ? 'изображение' : 'файл'} или нажмите
              </p>
              <p className="text-xs text-gray-600">
                {activeSection === 'image' ? 'PNG, JPG до 10MB' : 'Изображение или видео'}
              </p>
            </div>
          </div>
        )}

        {/* Input - Premium Design with glow */}
        <div className={cn(
          "flex items-end gap-3 p-3 md:p-4 rounded-[20px] bg-[var(--surface)]/80 backdrop-blur-xl border transition-all duration-300 input-glow",
          isDragging 
            ? "border-[var(--accent-primary)] shadow-[0_0_40px_rgba(167,139,250,0.25)]" 
            : "border-[var(--border)] hover:border-[var(--border-hover)] focus-within:border-[var(--accent-primary)]/60 focus-within:shadow-[0_0_40px_rgba(167,139,250,0.15)]"
        )}>
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
            className="p-3 md:p-2.5 rounded-[12px] text-[var(--muted)] hover:text-[var(--accent-secondary)] hover:bg-[var(--surface2)] active:scale-95 flex-shrink-0 touch-manipulation transition-all duration-200"
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
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--muted)] resize-none max-h-[150px] py-2 text-[var(--text)]"
          />
          
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <span className="text-[13px] font-medium text-[var(--muted)] hidden sm:block">{currentCost}⭐</span>
            
            <button
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "p-3 md:p-3 rounded-[14px] touch-manipulation transition-all duration-300",
                prompt.trim() && !isGenerating
                  ? "bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] shadow-[0_4px_20px_rgba(167,139,250,0.3)] text-white hover:shadow-[0_6px_30px_rgba(167,139,250,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                  : "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
              )}
            >
              <Send className={cn("w-5 h-5 transition-transform", isGenerating && "animate-pulse")} />
            </button>
          </div>
        </div>
        
        {/* Bottom info - hidden on mobile to save space */}
        <div className="hidden md:flex items-center justify-between mt-2 px-2">
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
        {/* Mobile: Compact info */}
        <div className="flex md:hidden items-center justify-center mt-2 px-2">
          <span className="text-xs text-gray-500">
            {modelInfo?.name} • {currentCost}⭐
          </span>
        </div>
      </div>
    </div>
  );
}
