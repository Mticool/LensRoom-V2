'use client';

import { useState } from 'react';
import { Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoSidebarProps {
  settings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

export function VideoSidebar({ settings, onSettingsChange }: VideoSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[var(--surface)] border-l border-[var(--border)] flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-[var(--surface2)] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="font-semibold text-[var(--text)]">Настройки</h2>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-[var(--surface2)] rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-sm text-[var(--muted)]">
          Настройки видео будут здесь
        </div>
      </div>
    </div>
  );
}


