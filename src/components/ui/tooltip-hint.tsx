'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipHintProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delay?: number;
  className?: string;
  shortcut?: string;
}

export function TooltipHint({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 300,
  className,
  shortcut,
}: TooltipHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const alignments = {
    start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
    center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
    end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0',
  };

  const arrowPositions = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--surface)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--surface)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--surface)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--surface)] border-y-transparent border-l-transparent',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'absolute z-50 pointer-events-none',
              positions[side],
              alignments[align]
            )}
          >
            <div
              className={cn(
                'px-3 py-2 rounded-lg',
                'bg-[var(--surface)] border border-[var(--border)]',
                'text-sm text-[var(--text)]',
                'shadow-xl shadow-black/20',
                'whitespace-nowrap',
                className
              )}
            >
              <div className="flex items-center gap-2">
                <span>{content}</span>
                {shortcut && (
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface2)] text-[var(--muted)] text-xs font-mono">
                    {shortcut}
                  </kbd>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Preset tooltips
export function GenerateTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Создать" shortcut="⌘↵">
      {children}
    </TooltipHint>
  );
}

export function CopyTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Копировать" shortcut="⌘C">
      {children}
    </TooltipHint>
  );
}

export function DownloadTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Скачать" shortcut="⌘S">
      {children}
    </TooltipHint>
  );
}

export function DeleteTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Удалить" shortcut="Del">
      {children}
    </TooltipHint>
  );
}

export function FavoriteTooltip({ children, isFavorite = false }: { children: ReactNode; isFavorite?: boolean }) {
  return (
    <TooltipHint content={isFavorite ? 'Убрать из избранного' : 'В избранное'} shortcut="F">
      {children}
    </TooltipHint>
  );
}

export function CloseTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Закрыть" shortcut="Esc">
      {children}
    </TooltipHint>
  );
}

export function SettingsTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="Настройки">
      {children}
    </TooltipHint>
  );
}

export function HistoryTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipHint content="История" shortcut="H">
      {children}
    </TooltipHint>
  );
}










