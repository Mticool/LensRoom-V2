'use client';

import { ChevronRight } from 'lucide-react';
import { useRef } from 'react';

interface HorizontalScrollProps {
  title: string;
  icon?: React.ReactNode;
  onViewAll?: () => void;
  children: React.ReactNode;
}

export function HorizontalScroll({ title, icon, onViewAll, children }: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    }
  };

  return (
    <div className="mb-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="text-base font-semibold text-white">
            {title}
          </h2>
        </div>
        
        {onViewAll && (
          <button
            onClick={handleViewAll}
            className="flex items-center gap-0.5 text-xs text-[#8cf425] hover:text-[#a0ff40] transition-colors"
          >
            Все
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Горизонтальный скролл */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
