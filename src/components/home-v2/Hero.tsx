'use client';

import { FeaturedCard, Card } from './Card';
import type { Item } from './data';

interface HeroProps {
  featured: Item;
  sideItems: Item[];
}

export function Hero({ featured, sideItems }: HeroProps) {
  return (
    <section className="pt-24 pb-8">
      <div className="container mx-auto px-6">
        {/* Desktop: Large featured + 2 side cards */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-4">
          {/* Featured takes 2 columns */}
          <div className="col-span-2">
            <FeaturedCard item={featured} />
          </div>
          
          {/* Side items stacked */}
          <div className="flex flex-col gap-4">
            {sideItems.map((item) => (
              <Card 
                key={item.id} 
                item={item} 
                aspectClassName="aspect-square flex-1"
                priority
              />
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: Just featured */}
        <div className="lg:hidden">
          <FeaturedCard item={featured} />
        </div>
      </div>
    </section>
  );
}
