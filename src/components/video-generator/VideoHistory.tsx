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
    router.push(`/generators?generationId=${item.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center py-8 text-[var(--muted)] text-sm">
        История генераций пуста
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className="group relative aspect-video rounded-lg overflow-hidden bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition-all"
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
            <Play className="w-10 h-10 text-white" fill="white" />
          </div>

          {/* Status badge */}
          {item.status === 'processing' && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-yellow-500/90 text-xs text-black font-semibold">
              Обработка...
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
