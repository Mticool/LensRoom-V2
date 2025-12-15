import { Loader2, Video } from 'lucide-react';

export default function VideoCreatePageLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="flex">
        {/* Left Sidebar Skeleton */}
        <aside className="w-64 min-h-screen border-r border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-[var(--surface2)] rounded animate-pulse" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-[var(--surface2)] animate-pulse">
                <div className="h-4 w-24 bg-[var(--border)] rounded mb-2" />
                <div className="h-3 w-full bg-[var(--border)] rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Generator Controls Skeleton */}
              <div className="space-y-4">
                <div className="h-12 bg-[var(--surface)] rounded-xl animate-pulse" />
                <div className="h-32 bg-[var(--surface)] rounded-xl animate-pulse" />
                <div className="h-24 bg-[var(--surface)] rounded-xl animate-pulse" />
              </div>

              {/* Preview Skeleton */}
              <div className="aspect-video bg-[var(--surface)] rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-[var(--gold)] mx-auto mb-4 animate-pulse" />
                  <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin mx-auto" />
                  <p className="text-sm text-[var(--muted)] mt-4">Загрузка генератора видео...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
