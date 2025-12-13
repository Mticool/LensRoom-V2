import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function Loading({
  size = "md",
  text,
  fullScreen,
  className,
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-[3px]",
    lg: "w-12 h-12 border-4",
  };

  const content = (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-[var(--color-gold)]/30 border-t-[var(--color-gold)] animate-spin",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-[rgba(255,255,255,0.55)] animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton component for loading states
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-[rgba(255,255,255,0.06)] rounded animate-pulse",
        className
      )}
    />
  );
}

// Card skeleton for library/gallery loading
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)]">
      <Skeleton className="aspect-square" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Page loading component
export function PageLoading() {
  return (
    <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
      <Loading size="lg" text="Загрузка..." />
    </div>
  );
}

