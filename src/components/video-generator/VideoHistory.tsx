'use client';

import { useState, useEffect } from 'react';
import { Loader2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VideoHistoryItem {
  id: string;
  thumbnail_url?: string;
  output_url?: string;
  prompt?: string;
  status: string;
  created_at: string;
}

export function VideoHistory() {
  const router = useRouter();
  const [items, setItems] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/library?type=video&limit=12');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.generations || []);
    } catch (error) {
      console.error('Failed to load video history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: VideoHistoryItem) => {
    // Открыть с параметрами генерации
    router.push(`/create/studio?section=video&generationId=${item.id}`);
  };

  const SkeletonGrid = ({ count = 12 }: { count?: number }) => {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-video rounded-md border border-[var(--border)] bg-[var(--surface2)] skeleton-smooth"
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <SkeletonGrid />
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-[var(--muted)]">Пока пусто — здесь появятся ваши последние результаты.</div>
        <SkeletonGrid count={12} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className="group relative aspect-video rounded-md overflow-hidden bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-all"
        >
          {item.thumbnail_url ? (
            <img
              src={item.thumbnail_url}
              alt={item.prompt || 'Video'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-[var(--muted)]" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-8 h-8 text-white" fill="white" />
          </div>

          {/* Status badge */}
          {item.status === 'processing' && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-yellow-500/90 text-[10px] text-black font-semibold">
              В работе
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
