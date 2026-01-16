'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, ChevronDown, Wand2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QualityOption {
  value: string;
  label: string;
  cost: number;
}

interface UniversalPromptBarProps {
  modelId: string;
  modelName: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  aspectRatio: string;
  aspectRatios: string[]; // Доступные форматы для этой модели
  quality?: string;
  qualityOptions: QualityOption[]; // Доступные качества для этой модели
  variantsCount: number;
  uploadedFiles: File[];
  isGenerating: boolean;
  creditsPerVariant: number; // Цена за 1 вариант (с учетом качества)
  onAspectRatioChange: (value: string) => void;
  onQualityChange?: (value: string) => void;
  onVariantsChange: (value: number) => void;
  onFilesChange: (files: File[]) => void;
  onGenerate: () => void;
  supportsI2i: boolean; // Поддерживает ли модель загрузку изображений
}

export function UniversalPromptBar({
  modelId,
  modelName,
  prompt,
  onPromptChange,
  aspectRatio,
  aspectRatios,
  quality,
  qualityOptions,
  variantsCount,
  uploadedFiles,
  isGenerating,
  creditsPerVariant,
  onAspectRatioChange,
  onQualityChange,
  onVariantsChange,
  onFilesChange,
  onGenerate,
  supportsI2i,
}: UniversalPromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const aspectRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aspectRef.current && !aspectRef.current.contains(e.target as Node)) {
        setShowAspectMenu(false);
      }
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating) {
      e.preventDefault();
      onGenerate();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesChange([...uploadedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    onFilesChange(uploadedFiles.filter((_, i) => i !== index));
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      onFilesChange([...uploadedFiles, ...files]);
    }
  };

  const totalCost = creditsPerVariant * variantsCount;

  return (
    <div className="relative">
      {/* Main Compact Block */}
      <div 
        className={cn(
          "bg-[#1a1a2e] border rounded-2xl transition-all relative",
          isDragging && supportsI2i
            ? "border-cyan-500 border-2 shadow-lg shadow-cyan-500/20" 
            : "border-white/10"
        )}
        onDragEnter={supportsI2i ? handleDragEnter : undefined}
        onDragLeave={supportsI2i ? handleDragLeave : undefined}
        onDragOver={supportsI2i ? handleDragOver : undefined}
        onDrop={supportsI2i ? handleDrop : undefined}
      >
        {/* Drag Overlay */}
        {isDragging && supportsI2i && (
          <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
              <p className="text-cyan-400 font-medium">Отпустите чтобы загрузить</p>
            </div>
          </div>
        )}
        
        {/* Textarea with Upload Button */}
        <div className="relative flex items-start gap-3 px-4 pt-4 pb-2 rounded-t-2xl overflow-hidden">
          {/* Upload Button (только если модель поддерживает I2I) */}
          {supportsI2i && (
            <button
              onClick={handleFileSelect}
              disabled={isGenerating}
              title="Загрузить референс изображение"
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all mt-0.5",
                uploadedFiles.length > 0
                  ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите что хотите создать..."
            disabled={isGenerating}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-[15px] leading-relaxed min-h-[32px] max-h-[120px]"
            rows={1}
          />
        </div>

        {/* Uploaded Files Preview (if any) */}
        {uploadedFiles.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/30 border border-white/10">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings Bar */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
          {/* Left Side: Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Model Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5">
              <span className="text-xs font-medium text-white">{modelName}</span>
            </div>

            {/* Variants Counter - показываем стоимость */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5">
              <button
                onClick={() => onVariantsChange(Math.max(1, variantsCount - 1))}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                disabled={variantsCount <= 1 || isGenerating}
              >
                −
              </button>
              <div className="flex items-center justify-center min-w-[32px]">
                <span className="text-xs font-medium text-white">
                  {variantsCount}/4
                </span>
              </div>
              <button
                onClick={() => onVariantsChange(Math.min(4, variantsCount + 1))}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                disabled={variantsCount >= 4 || isGenerating}
              >
                +
              </button>
            </div>

            {/* Aspect Ratio Dropdown */}
            <div className="relative" ref={aspectRef}>
              <button
                onClick={() => {
                  setShowAspectMenu(!showAspectMenu);
                  setShowQualityMenu(false);
                }}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-white">{aspectRatio}</span>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-gray-400 transition-transform",
                  showAspectMenu && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {showAspectMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 z-50 min-w-[100px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          onAspectRatioChange(ratio);
                          setShowAspectMenu(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs transition-colors",
                          aspectRatio === ratio
                            ? "bg-cyan-500/20 text-cyan-400 font-medium"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quality Dropdown (только если есть опции качества) */}
            {qualityOptions.length > 0 && quality && onQualityChange && (
              <div className="relative" ref={qualityRef}>
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowAspectMenu(false);
                  }}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <Wand2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-white">{quality}</span>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-gray-400 transition-transform",
                    showQualityMenu && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 z-50 min-w-[120px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                    >
                      {qualityOptions.map((q) => (
                        <button
                          key={q.value}
                          onClick={() => {
                            onQualityChange(q.value);
                            setShowQualityMenu(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between",
                            quality === q.value
                              ? "bg-cyan-500/20 text-cyan-400 font-medium"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <span>{q.label}</span>
                          <span className="text-[10px] text-gray-500">{q.cost}⭐</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Side: Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              isGenerating
                ? "bg-gray-700 text-gray-400"
                : "bg-gradient-to-r from-[#B8FF2D] to-[#8FE824] text-black hover:shadow-lg hover:shadow-[#B8FF2D]/20"
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate {variantsCount > 1 ? `⚡${variantsCount}` : ''}</span>
            {totalCost > 0 && <span className="text-xs opacity-80">{totalCost}⭐</span>}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      {supportsI2i && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
}
