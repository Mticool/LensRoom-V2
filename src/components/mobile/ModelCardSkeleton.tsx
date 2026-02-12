/**
 * Skeleton loader for ModelCard component
 */

interface ModelCardSkeletonProps {
  variant?: 'compact' | 'large';
}

export function ModelCardSkeleton({ variant = 'compact' }: ModelCardSkeletonProps) {
  if (variant === 'large') {
    return (
      <div className="flex-shrink-0 w-40 h-48 rounded-2xl overflow-hidden bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] animate-pulse">
        {/* Icon area */}
        <div className="h-24 flex items-center justify-center bg-[rgba(255,255,255,0.04)]">
          <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Info area */}
        <div className="p-3 space-y-2">
          <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-3/4" />
          <div className="h-3 bg-[rgba(255,255,255,0.06)] rounded w-1/2" />
          <div className="flex items-center justify-between">
            <div className="h-3 bg-[rgba(255,255,255,0.06)] rounded w-12" />
            <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-10" />
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div className="flex-shrink-0 w-28 h-36 rounded-xl overflow-hidden bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] animate-pulse">
      {/* Icon area */}
      <div className="h-16 flex items-center justify-center bg-[rgba(255,255,255,0.04)]">
        <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)]" />
      </div>

      {/* Info area */}
      <div className="p-2 space-y-2">
        <div className="h-3 bg-[rgba(255,255,255,0.06)] rounded w-full" />
        <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded w-2/3" />
        <div className="h-3 bg-[rgba(255,255,255,0.06)] rounded w-10" />
      </div>
    </div>
  );
}
