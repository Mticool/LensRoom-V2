'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { GenerationResult } from '@/types/generator';

export type HistoryItem = GenerationResult;

interface HistoryPanelProps {
  history: GenerationResult[];
  onSelect: (item: GenerationResult) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  selectedId?: string;
}

export function HistoryPanel({
  history,
  onSelect,
  onDelete,
  onToggleFavorite,
  selectedId,
}: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const filteredHistory = filter === 'favorites'
    ? history.filter((item) => item.isFavorite)
    : history;

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
      >
        <span className="font-medium text-foreground">История ({history.length})</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {/* Filter Tabs */}
            <div className="flex gap-2 px-4 pb-3">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilter('all')}
              >
                Все
              </Button>
              <Button
                size="sm"
                variant={filter === 'favorites' ? 'default' : 'ghost'}
                onClick={() => setFilter('favorites')}
              >
                <Heart className="w-3 h-3 mr-1" />
                Избранное
              </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2 p-4 pt-0 max-h-60 overflow-y-auto">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden cursor-pointer group',
                    'border-2 transition-colors',
                    selectedId === item.id
                      ? 'border-primary'
                      : 'border-transparent hover:border-primary/50'
                  )}
                  onClick={() => onSelect(item)}
                >
                  <img
                    src={item.url || item.thumbnail || '/placeholder.png'}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <Heart
                        className={cn(
                          'w-3 h-3',
                          item.isFavorite ? 'fill-red-500 text-red-500' : 'text-white'
                        )}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  {/* Favorite Badge */}
                  {item.isFavorite && (
                    <div className="absolute top-1 right-1">
                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

