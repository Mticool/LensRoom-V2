'use client';

import { Card } from './Card';
import type { Item } from './data';

interface GridProps {
  title: string;
  items: Item[];
  type?: 'masonry' | 'uniform';
}

export function Grid({ title, items, type = 'uniform' }: GridProps) {
  return (
    <section className="py-12 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <h2 className="text-2xl font-bold text-[var(--text)] mb-8">{title}</h2>
        
        {type === 'masonry' ? (
          // Masonry grid for photos (mix of 1:1 and 9:16)
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
            {items.map((item, idx) => {
              // Create masonry rhythm: some tall (9:16), most square (1:1)
              const isTall = item.aspect === '9:16';
              const spanClass = isTall ? 'row-span-2' : 'row-span-1';
              
              return (
                <div key={item.id} className={spanClass}>
                  <Card 
                    item={item} 
                    aspectClassName="h-full"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          // Uniform grid for videos and tools
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <Card 
                key={item.id}
                item={item} 
                aspectClassName={
                  item.aspect === '16:9' ? 'aspect-video' : 
                  item.aspect === '9:16' ? 'aspect-[9/16]' : 
                  'aspect-square'
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
