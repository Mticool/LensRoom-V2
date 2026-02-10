'use client';

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WanPromptTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  maxLength?: number;
  onSubmit?: () => void;
  onFocus?: () => void;
}

export function WanPromptTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength = 1000,
  onSubmit,
  onFocus,
}: WanPromptTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const safeValue = useMemo(() => {
    const s = String(value ?? '');
    return s.length > maxLength ? s.slice(0, maxLength) : s;
  }, [value, maxLength]);

  // Auto-resize with a smooth height transition (Wan-like "expands" feel).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = `${Math.max(20, next)}px`;
  }, [safeValue]);

  return (
    <textarea
      ref={ref}
      value={safeValue}
      rows={1}
      onFocus={onFocus}
      onChange={(e) => {
        const next = e.target.value ?? '';
        onChange(next.length > maxLength ? next.slice(0, maxLength) : next);
      }}
      onKeyDown={(e) => {
        if (!onSubmit) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      data-testid="studio-prompt-textarea"
      className={cn(
        'w-full resize-none overflow-y-auto',
        'bg-transparent text-white placeholder:text-white/35',
        'text-sm leading-snug',
        'px-3 py-2.5',
        'border-none outline-none',
        'focus:outline-none focus:ring-0',
        'transition-[height] duration-300 ease-out',
        'max-h-[120px]',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
      aria-label="Промпт для генерации"
    />
  );
}

