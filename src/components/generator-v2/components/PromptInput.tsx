'use client';

import { Loader2, Sparkles } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  costInfo: { stars: number; credits: number };
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  onGenerate,
  isGenerating,
  costInfo,
  disabled = false,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && value.trim() && !isGenerating && !disabled) {
      e.preventDefault();
      onGenerate();
    }
  };

  const canGenerate = value.trim().length > 0 && !isGenerating && !disabled;

  return (
    <div className="flex-shrink-0 border-t border-[#27272A] bg-[#18181B] px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3">
          {/* Textarea */}
          <div className="flex-1">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the scene you imagine..."
              disabled={disabled}
              className="w-full h-24 px-4 py-3 bg-[#27272A] border border-[#3F3F46] rounded-lg text-white placeholder-[#71717A] resize-none focus:outline-none focus:ring-2 focus:ring-[#CDFF00] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-[#71717A]">
              <span>Press Ctrl+Enter to generate</span>
              <span>{value.length} characters</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="px-6 py-3 h-24 bg-[#CDFF00] hover:bg-[#B8E600] text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#CDFF00] flex flex-col items-center justify-center gap-1 min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Generate</span>
                <span className="text-xs opacity-70">{costInfo.stars} ⭐</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
