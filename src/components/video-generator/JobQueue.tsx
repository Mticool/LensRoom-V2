'use client';

import { useState } from 'react';
import { Grid3x3, List, ChevronDown, ChevronUp } from 'lucide-react';
import { JobCard } from './JobCard';
import type { VideoJob, JobViewMode } from '@/types/video-generator';

interface JobQueueProps {
  jobs: VideoJob[];
  onRetry?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDownload?: (jobId: string, url: string) => void;
  defaultExpanded?: boolean;
}

export function JobQueue({ jobs, onRetry, onCancel, onDownload, defaultExpanded = true }: JobQueueProps) {
  const [viewMode, setViewMode] = useState<JobViewMode>('grid');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter active jobs (queued or processing)
  const activeJobs = jobs.filter((job) => job.status === 'queued' || job.status === 'processing');
  const completedJobs = jobs.filter((job) => job.status === 'completed');
  const failedJobs = jobs.filter((job) => job.status === 'failed');

  // Don't show if no jobs
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--surface2)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-[var(--accent-primary)] transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>Генерации</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--surface3)] text-xs text-[var(--muted)]">
            {jobs.length}
          </span>
        </button>

        <div className="flex items-center gap-4">
          {/* Status counts */}
          <div className="flex items-center gap-3 text-xs">
            {activeJobs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-[var(--muted)]">{activeJobs.length} активных</span>
              </div>
            )}
            {completedJobs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[var(--muted)]">{completedJobs.length} готово</span>
              </div>
            )}
            {failedJobs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[var(--muted)]">{failedJobs.length} ошибок</span>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[var(--surface3)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent-primary)] text-black'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--accent-primary)] text-black'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {isExpanded && (
        <div className="p-4 bg-[var(--surface1)]">
          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-[var(--muted)]">Активные генерации</h3>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {activeJobs.map((job) => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    viewMode={viewMode}
                    onRetry={onRetry}
                    onCancel={onCancel}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-[var(--muted)]">Завершённые</h3>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {completedJobs.map((job) => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    viewMode={viewMode}
                    onRetry={onRetry}
                    onCancel={onCancel}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-[var(--muted)]">С ошибками</h3>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                }
              >
                {failedJobs.map((job) => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    viewMode={viewMode}
                    onRetry={onRetry}
                    onCancel={onCancel}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
