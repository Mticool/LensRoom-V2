import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--surface2)]',
        className
      )}
    />
  );
}

// Card skeleton for generations
export function GenerationCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Grid of card skeletons
export function GenerationGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden animate-pulse">
          <div className="aspect-square bg-[var(--surface2)]" />
          <div className="p-2 space-y-1.5">
            <div className="h-3 w-3/4 bg-[var(--surface2)] rounded" />
            <div className="h-2 w-1/2 bg-[var(--surface2)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// History item skeleton
export function HistoryItemSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// History sidebar skeleton
export function HistorySidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <HistoryItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Settings panel skeleton
export function SettingsPanelSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Model selector */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      
      {/* Quality */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
      
      {/* Aspect ratio */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Pricing card skeleton
export function PricingCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="text-center space-y-4">
        <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
        <Skeleton className="h-6 w-24 mx-auto" />
        <Skeleton className="h-10 w-32 mx-auto" />
        <Skeleton className="h-8 w-20 mx-auto rounded-full" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full mt-6 rounded-lg" />
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

