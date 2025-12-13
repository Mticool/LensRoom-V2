'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ChevronDown, ChevronUp, Loader2, Image as ImageIcon, Video, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationHistory, type Generation } from '@/hooks/use-generations';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HistoryPanelProps {
  type?: 'photo' | 'video' | 'product';
  onSelect?: (item: Generation) => void;
  selectedId?: string;
}

export function HistoryPanel({
  type,
  onSelect,
  selectedId,
}: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  
  const {
    generations,
    isLoading,
    error,
    refetch,
    remove,
    toggleFavorite,
    isDeleting,
  } = useGenerationHistory(type);

  const filteredHistory = filter === 'favorites'
    ? generations.filter((item) => item.is_favorite)
    : generations;

  // Get preview URL from results
  const getPreviewUrl = (item: Generation): string => {
    if (item.thumbnail_url) return item.thumbnail_url;
    if (item.results && item.results.length > 0) {
      return item.results[0].thumbnail || item.results[0].url;
    }
    return '/placeholder.png';
  };

  const handleSelect = (item: Generation) => {
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Удалить эту генерацию?')) {
      await remove(id);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, isFavorite: boolean) => {
    e.stopPropagation();
    await toggleFavorite(id, !isFavorite);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden bg-[#0F0F14] border-[#26262E]">
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
          <span className="text-[#A0A0AA]">Загрузка истории...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="overflow-hidden bg-[#0F0F14] border-[#26262E]">
        <div className="p-4 text-center">
          <p className="text-red-400 mb-2">Ошибка загрузки истории</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить
          </Button>
        </div>
      </Card>
    );
  }

  // Empty state
  if (generations.length === 0) {
    return (
      <Card className="overflow-hidden bg-[#0F0F14] border-[#26262E]">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#16161D] flex items-center justify-center mx-auto mb-3">
            {type === 'video' ? (
              <Video className="w-6 h-6 text-[#6B6B78]" />
            ) : (
              <ImageIcon className="w-6 h-6 text-[#6B6B78]" />
            )}
          </div>
          <p className="text-[#A0A0AA] text-sm">История пуста</p>
          <p className="text-[#6B6B78] text-xs mt-1">Ваши генерации появятся здесь</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-[#0F0F14] border-[#26262E]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#16161D] transition-colors"
      >
        <span className="font-medium text-white">История ({generations.length})</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#A0A0AA]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#A0A0AA]" />
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                className="ml-auto"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2 p-4 pt-0 max-h-80 overflow-y-auto">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden cursor-pointer group',
                    'border-2 transition-colors',
                    selectedId === item.id
                      ? 'border-purple-500'
                      : 'border-transparent hover:border-purple-500/50'
                  )}
                  onClick={() => handleSelect(item)}
                >
                  <img
                    src={getPreviewUrl(item)}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />

                  {/* Type Badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                    {item.type === 'video' ? '🎬' : '🖼️'}
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <div className="flex gap-1 mb-2">
                      <button
                        onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        disabled={isDeleting}
                      >
                        <Heart
                          className={cn(
                            'w-3 h-3',
                            item.is_favorite ? 'fill-red-500 text-red-500' : 'text-white'
                          )}
                        />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/50 transition-colors"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <span className="text-[10px] text-white/80 text-center px-2 line-clamp-2">
                      {item.prompt.slice(0, 50)}...
                    </span>
                  </div>

                  {/* Favorite Badge */}
                  {item.is_favorite && (
                    <div className="absolute top-1 right-1">
                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    </div>
                  )}

                  {/* Time Badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-white/80">
                    {formatDistanceToNow(new Date(item.created_at), { 
                      addSuffix: false,
                      locale: ru,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
