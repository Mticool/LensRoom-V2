'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer (300ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
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
  }, [localValue]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "w-full px-4 py-3 pr-10 rounded-lg resize-none overflow-hidden",
          "bg-[#1a1a1a] text-white placeholder:text-gray-500",
          "border border-[#2a2a2a] focus:border-[#CDFF00] focus:outline-none",
          "transition-all duration-200",
          "min-h-[44px] max-h-[120px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Промпт для генерации"
      />
      <Sparkles className="absolute right-3 top-3 w-5 h-5 text-gray-500 pointer-events-none" />
    </div>
  );
}
