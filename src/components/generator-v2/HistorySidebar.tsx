'use client';

import { useState, useEffect } from 'react';
import { Clock, X, Copy, Repeat, Image, Film, Loader2, RefreshCw, Bell, Star, ChevronRight, Edit, Sparkles } from 'lucide-react';
import { GenerationResult } from './GeneratorV2';

// Helper to get thumbnail dimensions based on aspect ratio
const getThumbnailDimensions = (aspectRatio: string | undefined): { width: number; height: number; className: string } => {
  // Default: 56x56 (1:1)
  const base = 56; // w-14 = 56px
  
  switch (aspectRatio) {
    case '16:9':
      return { width: base, height: Math.round(base * 9 / 16), className: 'w-14 h-8' }; // 56x32
    case '9:16':
      return { width: Math.round(base * 9 / 16), height: base, className: 'w-8 h-14' }; // 32x56
    case '4:3':
      return { width: base, height: Math.round(base * 3 / 4), className: 'w-14 h-10' }; // 56x42
    case '3:4':
      return { width: Math.round(base * 3 / 4), height: base, className: 'w-10 h-14' }; // 42x56
    case '21:9':
      return { width: base, height: Math.round(base * 9 / 21), className: 'w-14 h-6' }; // 56x24
    case '2:3':
      return { width: Math.round(base * 2 / 3), height: base, className: 'w-9 h-14' }; // 37x56
    case '3:2':
      return { width: base, height: Math.round(base * 2 / 3), className: 'w-14 h-9' }; // 56x37
    case '1:1':
    default:
      return { width: base, height: base, className: 'w-14 h-14' };
  }
};

interface HistorySidebarProps {
  isOpen: boolean;
  history: GenerationResult[];
  onSelect: (result: GenerationResult) => void;
  onClose: () => void;
  onCopyPrompt?: (prompt: string) => void;
  onRepeat?: (result: GenerationResult) => void;
  onEdit?: (result: GenerationResult) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onConnectBot?: () => void;
}

export function HistorySidebar({ isOpen, history, onSelect, onClose, onCopyPrompt, onRepeat, onEdit, isLoading, onRefresh, onConnectBot }: HistorySidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  
  // Check if user needs notification banner
  useEffect(() => {
    const dismissed = localStorage.getItem('notification_banner_sidebar_dismissed');
    if (!dismissed) {
      fetch('/api/notifications/check', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (!data.enabled) {
            setShowNotificationBanner(true);
          }
        })
        .catch(() => {});
    }
  }, []);
  
  const dismissBanner = () => {
    setShowNotificationBanner(false);
    localStorage.setItem('notification_banner_sidebar_dismissed', 'true');
  };

  if (!isOpen) return null;

  const handleCopy = (e: React.MouseEvent, result: GenerationResult) => {
    e.stopPropagation();
    onCopyPrompt?.(result.prompt);
    setCopiedId(result.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRepeat = (e: React.MouseEvent, result: GenerationResult) => {
    e.stopPropagation();
    onRepeat?.(result);
  };

  const handleEdit = (e: React.MouseEvent, result: GenerationResult) => {
    e.stopPropagation();
    onEdit?.(result);
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'сейчас';
    if (minutes < 60) return `${minutes}м`;
    if (hours < 24) return `${hours}ч`;
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="w-64 border-l border-[#27272A] bg-[#18181B] overflow-y-auto flex flex-col text-[13px]">
      {/* Header - Compact */}
      <div className="px-3 py-2.5 border-b border-[#27272A] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#71717A]" />
          <span className="text-xs font-medium text-white">История</span>
          {history.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#27272A] text-[10px] text-[#71717A]">
              {history.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded hover:bg-[#27272A] text-[#52525B] hover:text-white transition-colors disabled:opacity-50"
              title="Обновить"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#27272A] text-[#52525B] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center mx-auto mb-2">
              <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
            </div>
            <p className="text-[11px] text-[#52525B]">
              Загрузка...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#27272A] flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-[#3F3F46]" />
            </div>
            <p className="text-[11px] text-[#52525B]">
              История пуста
            </p>
            <p className="text-[10px] text-[#3F3F46] mt-1">
              Ваши генерации появятся здесь
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {history.map((result) => {
              const isPending = result.status === 'pending';
              const thumbnailDims = getThumbnailDimensions(result.settings?.size);
              
              // Pending skeleton item
              if (isPending) {
                return (
                  <div
                    key={result.id}
                    className="w-full rounded-lg overflow-hidden border border-[#00D9FF]/30 bg-[#00D9FF]/5 animate-pulse"
                  >
                    <div className="flex gap-2 p-1.5">
                      {/* Skeleton thumbnail with aspect ratio */}
                      <div className={`relative ${thumbnailDims.className} rounded-md bg-gradient-to-br from-[#00D9FF]/20 to-[#27272A] overflow-hidden flex-shrink-0 flex items-center justify-center`}>
                        <Sparkles className="w-5 h-5 text-[#00D9FF] animate-pulse" />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00D9FF]/10 to-transparent animate-shimmer" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-[11px] text-[#00D9FF] line-clamp-2 leading-tight">
                          {result.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-[#00D9FF]/70 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Создаётся...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Regular completed item
              return (
                <button
                  key={result.id}
                  onClick={() => onSelect(result)}
                  className="w-full group rounded-lg overflow-hidden border border-transparent hover:border-[#3F3F46] bg-[#27272A]/30 hover:bg-[#27272A]/60 transition-all text-left"
                >
                  {/* Compact thumbnail + info row */}
                  <div className="flex gap-2 p-1.5">
                    {/* Thumbnail with aspect ratio */}
                    <div className={`relative ${thumbnailDims.className} rounded-md bg-[#27272A] overflow-hidden flex-shrink-0`}>
                      {result.previewUrl || result.url ? (
                        result.mode === 'video' ? (
                          <video
                            src={result.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.previewUrl || result.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.mode === 'video' ? (
                            <Film className="w-5 h-5 text-[#3F3F46]" />
                          ) : (
                            <Image className="w-5 h-5 text-[#3F3F46]" />
                          )}
                        </div>
                      )}
                      {/* Mode badge */}
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded bg-black/60 flex items-center justify-center">
                        <span className="text-[8px]">
                          {result.mode === 'video' ? '🎬' : '🖼️'}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="text-[11px] text-[#E4E4E7] line-clamp-2 leading-tight">
                        {result.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-[#52525B]">
                          {formatTimestamp(result.timestamp)}
                        </span>
                        {result.settings?.size && result.settings.size !== '1:1' && (
                          <span className="text-[8px] text-[#3F3F46] px-1 py-0.5 rounded bg-[#27272A]">
                            {result.settings.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions - shown on hover */}
                  <div className="px-1.5 pb-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && result.mode === 'image' && (
                      <button
                        onClick={(e) => handleEdit(e, result)}
                        className="p-1.5 rounded-md hover:bg-[#A855F7]/20 text-[#52525B] hover:text-[#A855F7] transition-all flex items-center gap-1"
                        title="Редактировать изображение"
                      >
                        <Edit className="w-3 h-3" />
                        <span className="text-[10px]">Remix</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleCopy(e, result)}
                      className="p-1.5 rounded-md hover:bg-[#3F3F46] text-[#52525B] hover:text-white transition-all flex items-center gap-1"
                      title="Копировать промпт"
                    >
                      {copiedId === result.id ? (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleRepeat(e, result)}
                      className="p-1.5 rounded-md hover:bg-[#00D9FF]/20 text-[#52525B] hover:text-[#00D9FF] transition-all flex items-center gap-1 ml-auto"
                      title="Повторить с теми же настройками"
                    >
                      <Repeat className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Notification Banner */}
      {showNotificationBanner && onConnectBot && (
        <div className="flex-shrink-0 p-2 border-t border-[#27272A]">
          <button
            onClick={() => {
              onConnectBot();
              dismissBanner();
            }}
            className="w-full p-2.5 rounded-lg bg-gradient-to-r from-[#00D9FF]/10 to-transparent border border-[#00D9FF]/20 hover:border-[#00D9FF]/40 transition-all group text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#00D9FF]/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-3.5 h-3.5 text-[#00D9FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white group-hover:text-[#00D9FF] transition-colors truncate">
                  Уведомления
                </p>
                <p className="text-[10px] text-[#52525B] flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 text-[#FFD700]" />
                  +10⭐
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#52525B] group-hover:text-[#00D9FF] flex-shrink-0" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
