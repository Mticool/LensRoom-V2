'use client';

import { useState } from 'react';
import { Clock, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Generation {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  prompt: string;
  model: string;
  cost: number;
  duration?: string;
  result?: {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  };
  timestamp: Date;
  isFavorite?: boolean;
}

interface HistorySidebarProps {
  generations: Generation[];
  onSelectGeneration: (generation: Generation) => void;
  onDeleteGeneration: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  selectedId?: string;
}

export function HistorySidebar({
  generations,
  onSelectGeneration,
  onDeleteGeneration,
  onToggleFavorite,
  selectedId,
}: HistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[var(--surface)] border-r border-[var(--border)] flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-[var(--surface2)] rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
          <h2 className="font-semibold text-[var(--text)]">История</h2>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-[var(--surface2)] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {generations.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)] text-sm">
            История пуста
          </div>
        ) : (
          generations.map((gen) => (
            <div
              key={gen.id}
              onClick={() => onSelectGeneration(gen)}
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-colors group",
                selectedId === gen.id
                  ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30"
                  : "bg-[var(--surface2)] hover:bg-[var(--surface3)]"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm text-[var(--text)] line-clamp-2 flex-1">
                  {gen.prompt}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(gen.id);
                      }}
                      className="p-1 hover:bg-[var(--surface3)] rounded"
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          gen.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-[var(--muted)]"
                        )}
                      />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGeneration(gen.id);
                    }}
                    className="p-1 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>{gen.model}</span>
                <span>{gen.cost} ⭐</span>
              </div>
              
              {gen.result?.imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden">
                  <img
                    src={gen.result.imageUrl}
                    alt="Preview"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


