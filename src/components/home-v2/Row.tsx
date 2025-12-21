'use client';

import { Card } from './Card';
import type { Item } from './data';

interface RowProps {
  title: string;
  items: Item[];
}

export function Row({ title, items }: RowProps) {
  return (
    <section className="py-8">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl font-bold text-[var(--text)] mb-6">{title}</h2>
        
        {/* Horizontal scroll container */}
        <div className="relative -mx-6 px-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-none w-[280px] sm:w-[320px] snap-start"
              >
                <Card 
                  item={item} 
                  aspectClassName={item.aspect === '16:9' ? 'aspect-video' : item.aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
