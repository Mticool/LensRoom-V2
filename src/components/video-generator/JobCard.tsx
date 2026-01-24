'use client';

import { Download, RotateCcw, X, Film, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { VideoJob, JobViewMode } from '@/types/video-generator';

interface JobCardProps {
  job: VideoJob;
  viewMode: JobViewMode;
  onRetry?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDownload?: (jobId: string, url: string) => void;
}

export function JobCard({ job, viewMode, onRetry, onCancel, onDownload }: JobCardProps) {
  // Status badge
  const getStatusBadge = () => {
    switch (job.status) {
      case 'queued':
        return (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
            <Clock className="w-3 h-3" />
            <span>В очереди</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Генерация</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-3 h-3" />
            <span>Готово</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500">
            <XCircle className="w-3 h-3" />
            <span>Ошибка</span>
          </div>
        );
    }
  };

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--border-hover)] transition-colors">
        {/* Thumbnail / Preview */}
        <div className="aspect-video bg-[var(--surface3)] relative">
          {job.resultUrl || job.thumbnailUrl ? (
            <video
              src={job.resultUrl || job.thumbnailUrl}
              className="w-full h-full object-cover"
              controls={job.status === 'completed'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-12 h-12 text-[var(--muted)]" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2">{getStatusBadge()}</div>

          {/* Progress Bar */}
          {(job.status === 'queued' || job.status === 'processing') && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--surface3)]">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          {/* Prompt */}
          <p className="text-sm font-medium line-clamp-2">{job.prompt}</p>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>{job.modelName || job.modelId}</span>
            <span>•</span>
            <span>
              {job.duration}s • {job.quality}
            </span>
          </div>

          {/* Error */}
          {job.status === 'failed' && job.error && (
            <p className="text-xs text-red-500 line-clamp-1">{job.error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {job.status === 'completed' && job.resultUrl && (
              <button
                onClick={() => onDownload?.(job.jobId, job.resultUrl!)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-[var(--accent-primary)] text-black rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать
              </button>
            )}

            {job.status === 'failed' && (
              <button
                onClick={() => onRetry?.(job.jobId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-[var(--surface3)] text-[var(--text)] rounded-lg hover:bg-[var(--surface3)]/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Повторить
              </button>
            )}

            {(job.status === 'queued' || job.status === 'processing') && (
              <button
                onClick={() => onCancel?.(job.jobId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-[var(--surface3)] text-[var(--text)] rounded-lg hover:bg-[var(--surface3)]/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--border-hover)] transition-colors">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-32 h-20 bg-[var(--surface3)] rounded-lg flex-shrink-0 relative overflow-hidden">
          {job.resultUrl || job.thumbnailUrl ? (
            <video
              src={job.resultUrl || job.thumbnailUrl}
              className="w-full h-full object-cover"
              controls={job.status === 'completed'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-8 h-8 text-[var(--muted)]" />
            </div>
          )}

          {/* Progress Bar */}
          {(job.status === 'queued' || job.status === 'processing') && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--surface3)]">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{job.prompt}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1">
                <span>{job.modelName || job.modelId}</span>
                <span>•</span>
                <span>
                  {job.duration}s • {job.quality} • {job.aspectRatio}
                </span>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Error */}
          {job.status === 'failed' && job.error && (
            <p className="text-xs text-red-500 line-clamp-1">{job.error}</p>
          )}

          {/* Progress Text */}
          {(job.status === 'queued' || job.status === 'processing') && (
            <p className="text-xs text-[var(--muted)]">Прогресс: {job.progress}%</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {job.status === 'completed' && job.resultUrl && (
            <button
              onClick={() => onDownload?.(job.jobId, job.resultUrl!)}
              className="px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] text-black rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Скачать
            </button>
          )}

          {job.status === 'failed' && (
            <button
              onClick={() => onRetry?.(job.jobId)}
              className="px-4 py-2 text-sm font-medium bg-[var(--surface3)] text-[var(--text)] rounded-lg hover:bg-[var(--surface3)]/80 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Повторить
            </button>
          )}

          {(job.status === 'queued' || job.status === 'processing') && (
            <button
              onClick={() => onCancel?.(job.jobId)}
              className="px-4 py-2 text-sm font-medium bg-[var(--surface3)] text-[var(--text)] rounded-lg hover:bg-[var(--surface3)]/80 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Отменить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
