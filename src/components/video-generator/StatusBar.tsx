'use client';

import { Clock, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import type { VideoStatus } from '@/types/video-generator';

interface StatusBarProps {
  status: VideoStatus;
  progress?: number;
  error?: string | null;
}

export function StatusBar({ status, progress = 0, error }: StatusBarProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: Clock,
          text: 'Ожидает генерации',
          color: 'text-[var(--muted)]',
          bgColor: 'bg-[var(--surface3)]',
        };
      case 'queued':
        return {
          icon: Sparkles,
          text: 'В очереди...',
          color: 'text-[var(--accent-primary)]',
          bgColor: 'bg-[var(--accent-primary)]/10',
        };
      case 'processing':
        return {
          icon: Loader2,
          text: `Генерация... ${progress}%`,
          color: 'text-[var(--accent-primary)]',
          bgColor: 'bg-[var(--accent-primary)]/10',
          spin: true,
        };
      case 'success':
        return {
          icon: CheckCircle,
          text: 'Готово!',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        };
      case 'error':
        return {
          icon: XCircle,
          text: error || 'Ошибка генерации',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        };
      default:
        return {
          icon: Clock,
          text: 'Неизвестный статус',
          color: 'text-[var(--muted)]',
          bgColor: 'bg-[var(--surface3)]',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}
      >
        <Icon
          className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`}
          strokeWidth={2.5}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.color} truncate`}>{config.text}</p>

        {/* Progress Bar (только для processing) */}
        {status === 'processing' && progress > 0 && (
          <div className="mt-1.5 h-1 bg-[var(--surface2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
