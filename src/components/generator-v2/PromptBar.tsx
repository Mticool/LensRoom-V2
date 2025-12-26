'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GeneratorMode } from './GeneratorV2';

interface PromptBarProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  mode: GeneratorMode;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  credits?: number;
  estimatedCost?: number;
}

export function PromptBar({ 
  onGenerate, 
  isGenerating, 
  mode, 
  value: externalValue, 
  onChange,
  disabled = false,
  credits = 0,
  estimatedCost = 0,
}: PromptBarProps) {
  const [internalPrompt, setInternalPrompt] = useState('');
  const prompt = externalValue !== undefined ? externalValue : internalPrompt;
  const setPrompt = onChange || setInternalPrompt;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasEnoughCredits = credits >= estimatedCost;
  const isDisabled = disabled || isGenerating || !hasEnoughCredits;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isDisabled) {
      onGenerate(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="relative">
        {/* Main input container - Brighter, more visible */}
        <div className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
          disabled 
            ? 'bg-[#1C1C1E] border border-[#2C2C2E] opacity-50' 
            : 'bg-[#1E1E20] border-2 border-[#3A3A3C] hover:border-[#4A4A4C] focus-within:border-[#00D9FF] focus-within:shadow-[0_0_20px_rgba(0,217,255,0.15)]'
        }`}>
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled 
              ? 'Войдите для генерации...' 
              : `Опишите ${mode === 'video' ? 'видео' : 'изображение'}...`
            }
            disabled={disabled || isGenerating}
            className="relative w-full px-4 py-4 bg-transparent text-white text-sm placeholder:text-[#6B6B6E] resize-none focus:outline-none min-h-[52px] max-h-[160px] disabled:cursor-not-allowed"
            rows={1}
          />

          {/* Bottom bar */}
          <div className="relative px-4 pb-3 flex items-center justify-between">
            {/* Left: Hints */}
            <div className="flex items-center gap-3 text-[10px] text-[#6B6B6E]">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#2A2A2C] text-[#8E8E93] font-mono text-[9px]">⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#2A2A2C] text-[#8E8E93] font-mono text-[9px]">Enter</kbd>
              </span>
              <span className="text-[#3A3A3C]">•</span>
              <span className="text-[#6B6B6E]">? подсказки</span>
            </div>

            {/* Right: Cost + Generate */}
            <div className="flex items-center gap-3">
              {!disabled && estimatedCost > 0 && (
                <span className={`text-xs font-medium ${hasEnoughCredits ? 'text-[#8E8E93]' : 'text-[#FF453A]'}`}>
                  {estimatedCost}⭐
                </span>
              )}

              <button
                type="submit"
                disabled={!prompt.trim() || isDisabled}
                className="px-5 py-2.5 rounded-xl bg-[#00D9FF] hover:bg-[#22D3EE] text-[#0F0F10] text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#00D9FF]/20 hover:shadow-[#00D9FF]/30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Создаем...</span>
                  </>
                ) : disabled ? (
                  'Войдите'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Создать</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
