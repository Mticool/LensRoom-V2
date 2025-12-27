'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentPrompt?: string;
}

interface BatchProgressBarProps {
  progress: BatchProgress;
  className?: string;
  onCancel?: () => void;
}

export function BatchProgressBar({ progress, className, onCancel }: BatchProgressBarProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const isProcessing = progress.status === 'processing';

  // Таймер времени обработки
  useEffect(() => {
    if (!isProcessing) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (progress.status === 'idle') return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 w-96 bg-[#18181B] border border-[#27272A] rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#27272A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProcessing && <Loader2 className="w-4 h-4 text-[#00D9FF] animate-spin" />}
          {progress.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {progress.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
          <span className="text-sm font-medium text-[#E4E4E7]">
            {isProcessing ? 'Обработка изображений' : progress.status === 'completed' ? 'Завершено' : 'Ошибка'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#71717A] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(elapsedTime)}
          </span>
          {onCancel && isProcessing && (
            <button
              onClick={onCancel}
              className="text-xs text-[#71717A] hover:text-[#E4E4E7] transition-colors"
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#A1A1AA]">
            {progress.completed} / {progress.total} изображений
          </span>
          <span className="text-xs font-medium text-[#E4E4E7]">
            {Math.round(percentage)}%
          </span>
        </div>
        
        {/* Bar */}
        <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              progress.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-[#00D9FF] to-[#7B61FF]'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[#A1A1AA]">Готово: {progress.completed}</span>
          </div>
          {progress.failed > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[#A1A1AA]">Ошибки: {progress.failed}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#71717A]" />
            <span className="text-[#A1A1AA]">Осталось: {progress.total - progress.completed}</span>
          </div>
        </div>

        {/* Current Item */}
        {isProcessing && progress.currentPrompt && (
          <div className="mt-3 pt-3 border-t border-[#27272A]">
            <div className="flex items-start gap-2">
              <Loader2 className="w-3 h-3 text-[#00D9FF] animate-spin mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#71717A] mb-1">Текущий промпт:</p>
                <p className="text-xs text-[#E4E4E7] truncate">{progress.currentPrompt}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - ETA */}
      {isProcessing && progress.completed > 0 && (
        <div className="px-4 py-2 bg-[#27272A]/30 border-t border-[#27272A]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#71717A]">Примерное время:</span>
            <span className="text-[#A1A1AA]">
              ~{Math.ceil((elapsedTime / progress.completed) * (progress.total - progress.completed))}с
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

