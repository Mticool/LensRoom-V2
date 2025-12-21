'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Image, 
  Film,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type JobStatus = 'idle' | 'queued' | 'generating' | 'success' | 'failed';

interface ActiveJob {
  jobId: string;
  kind: 'image' | 'video';
  modelName: string;
  createdAt: number;
  status: JobStatus;
  progress: number;
  resultUrls: string[];
  error?: string | null;
  opened?: boolean;
}

interface GenerationQueueProps {
  jobs: ActiveJob[];
  onJobClick?: (job: ActiveJob) => void;
  onClearCompleted?: () => void;
}

// Estimated generation times (seconds)
const ESTIMATED_TIMES = {
  image: { min: 10, max: 30 },
  video: { min: 60, max: 180 },
};

function formatTimeRemaining(createdAt: number, kind: 'image' | 'video'): string {
  const ageSeconds = (Date.now() - createdAt) / 1000;
  const { min, max } = ESTIMATED_TIMES[kind];
  const avgTime = (min + max) / 2;
  const remaining = Math.max(0, avgTime - ageSeconds);
  
  if (remaining <= 0) return 'Скоро...';
  if (remaining < 60) return `~${Math.ceil(remaining)} сек`;
  return `~${Math.ceil(remaining / 60)} мин`;
}

function calculateProgress(createdAt: number, kind: 'image' | 'video'): number {
  const ageSeconds = (Date.now() - createdAt) / 1000;
  const { min, max } = ESTIMATED_TIMES[kind];
  const avgTime = (min + max) / 2;
  return Math.min(95, Math.round((ageSeconds / avgTime) * 100));
}

export function GenerationQueue({ jobs, onJobClick, onClearCompleted }: GenerationQueueProps) {
  const [expanded, setExpanded] = useState(true);
  
  if (jobs.length === 0) return null;

  const activeJobs = jobs.filter(j => j.status === 'generating' || j.status === 'queued');
  const completedJobs = jobs.filter(j => j.status === 'success' || j.status === 'failed');
  const hasCompleted = completedJobs.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {activeJobs.length > 0 ? (
              <Loader2 className="w-5 h-5 text-[var(--gold)] animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            )}
          </div>
          <div className="text-left">
            <div className="font-semibold text-[var(--text)]">
              Очередь генераций
            </div>
            <div className="text-xs text-[var(--muted)]">
              {activeJobs.length > 0 
                ? `${activeJobs.length} в работе` 
                : `${completedJobs.length} завершено`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeJobs.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--gold)]/20 text-[var(--gold)] rounded-full">
              {activeJobs.length}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
          )}
        </div>
      </button>

      {/* Jobs List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-[var(--border)]">
              {/* Active Jobs */}
              {activeJobs.map((job) => {
                const estimatedProgress = calculateProgress(job.createdAt, job.kind);
                const displayProgress = job.progress || estimatedProgress;
                const timeRemaining = formatTimeRemaining(job.createdAt, job.kind);

                return (
                  <div
                    key={job.jobId}
                    className="px-4 py-3 border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {job.kind === 'video' ? (
                          <Film className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Image className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[var(--text)] truncate">
                            {job.modelName}
                          </span>
                          <span className="shrink-0 text-xs text-[var(--muted)]">
                            {job.status === 'queued' ? 'В очереди' : `${displayProgress}%`}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[var(--gold)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${displayProgress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <Clock className="w-3 h-3" />
                          <span>{timeRemaining}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Completed Jobs */}
              {completedJobs.map((job) => (
                <div
                  key={job.jobId}
                  onClick={() => onJobClick?.(job)}
                  className={`px-4 py-3 border-b border-[var(--border)] last:border-b-0 ${
                    job.status === 'success' ? 'cursor-pointer hover:bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {job.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--text)] truncate">
                          {job.modelName}
                        </span>
                        <span className={`shrink-0 text-xs ${
                          job.status === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {job.status === 'success' ? 'Готово' : 'Ошибка'}
                        </span>
                      </div>
                      {job.error && (
                        <p className="mt-1 text-xs text-red-400 truncate">{job.error}</p>
                      )}
                    </div>
                    {job.status === 'success' && (
                      <ExternalLink className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {/* Actions */}
              {hasCompleted && (
                <div className="px-4 py-3 flex items-center justify-between gap-2 bg-[var(--surface2)]">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClearCompleted}
                    className="text-[var(--muted)] text-xs"
                  >
                    Очистить завершённые
                  </Button>
                  <Link href="/library">
                    <Button size="sm" className="text-xs bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
                      Открыть библиотеку
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
