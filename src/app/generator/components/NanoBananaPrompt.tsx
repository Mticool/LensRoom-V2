'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, ChevronDown, Wand2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NanoBananaPromptProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  aspectRatio: string;
  quality: string;
  variantsCount: number;
  uploadedFiles: File[];
  isGenerating: boolean;
  currentCost: number;
  onAspectRatioChange: (value: string) => void;
  onQualityChange: (value: string) => void;
  onVariantsChange: (value: number) => void;
  onFilesChange: (files: File[]) => void;
  onGenerate: () => void;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const QUALITIES = [
  { value: '1K', label: '1K', cost: 30 },
  { value: '2K', label: '2K', cost: 30 },
  { value: '4K', label: '4K', cost: 40 },
];

export function NanoBananaPrompt({
  prompt,
  onPromptChange,
  aspectRatio,
  quality,
  variantsCount,
  uploadedFiles,
  isGenerating,
  currentCost,
  onAspectRatioChange,
  onQualityChange,
  onVariantsChange,
  onFilesChange,
  onGenerate,
}: NanoBananaPromptProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const aspectRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative">
      {/* Main Compact Block */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden">
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите что хотите создать..."
            disabled={isGenerating}
            className="w-full px-4 pt-4 pb-2 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-[15px] leading-relaxed min-h-[60px] max-h-[120px]"
            rows={1}
          />

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
        </div>

        {/* Settings Bar */}
        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
          {/* Left Side: Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Model Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-xs">
                G
              </div>
              <span className="text-xs font-medium text-white">Nano Banana</span>
            </div>

            {/* Variants Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5">
              <button
                onClick={() => onVariantsChange(Math.max(1, variantsCount - 1))}
                className="text-gray-400 hover:text-white transition-colors text-sm"
                disabled={variantsCount <= 1 || isGenerating}
              >
                −
              </button>
              <span className="text-xs font-medium text-white min-w-[32px] text-center">
                {variantsCount}/4
              </span>
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
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 z-50 min-w-[100px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => {
                          onAspectRatioChange(ratio.value);
                          setShowAspectMenu(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs transition-colors",
                          aspectRatio === ratio.value
                            ? "bg-cyan-500/20 text-cyan-400 font-medium"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quality Dropdown */}
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
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 z-50 min-w-[120px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                  >
                    {QUALITIES.map((q) => (
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

            {/* Draw Button (Reference Image) */}
            <button
              onClick={handleFileSelect}
              disabled={isGenerating}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50",
                uploadedFiles.length > 0
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              )}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Draw</span>
            </button>
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
            {currentCost > 0 && <span className="text-xs opacity-80">{currentCost}⭐</span>}
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
