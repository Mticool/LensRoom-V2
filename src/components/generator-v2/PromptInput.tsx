'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function PromptInput({ 
  value, 
  onChange, 
  placeholder = "Describe what you want to create...",
  disabled = false,
  onSubmit
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!onSubmit) return;

    // Ctrl/Cmd + Enter always submits.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Enter submits; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        data-testid="studio-prompt-textarea"
        className={cn(
          "w-full px-4 py-3 pr-10 rounded-lg resize-none overflow-hidden",
          "bg-[#1a1a1a] text-white placeholder:text-gray-500",
          "border border-[#2a2a2a] focus:border-[#8cf425] focus:outline-none",
          "transition-colors duration-200 transition-[height] duration-150 ease-out",
          "min-h-[44px] max-h-[120px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Промпт для генерации"
      />
      <Sparkles className="absolute right-3 top-3 w-5 h-5 text-gray-500 pointer-events-none" />
    </div>
  );
}
