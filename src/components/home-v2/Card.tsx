'use client';

import Link from 'next/link';
import { Star, Play } from 'lucide-react';
import type { Item } from './data';

const CARD_CLASSES = {
  base: 'group relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] transition-all duration-300',
  hover: 'hover:border-[var(--gold)]/30 hover:shadow-lg hover:shadow-black/20',
  image: 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
  overlay: 'absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300',
  content: 'absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300',
  badge: 'absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold bg-black/60 backdrop-blur-sm',
  playIcon: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300',
};

const BADGE_COLORS = {
  NEW: 'text-blue-400 border border-blue-400/30',
  TOP: 'text-[var(--gold)] border border-[var(--gold)]/30',
  FAST: 'text-green-400 border border-green-400/30',
  PRO: 'text-purple-400 border border-purple-400/30',
};

interface CardProps {
  item: Item;
  aspectClassName?: string;
  priority?: boolean;
}

export function Card({ item, aspectClassName, priority = false }: CardProps) {
  return (
    <Link href="/create" className={`${CARD_CLASSES.base} ${CARD_CLASSES.hover} ${aspectClassName || ''}`}>
      {/* Image */}
      <div className="relative w-full h-full">
        <img
          src={item.imageUrl}
          alt={item.title}
          className={CARD_CLASSES.image}
          loading={priority ? 'eager' : 'lazy'}
        />
        
        {/* Badge */}
        {item.badge && (
          <div className={`${CARD_CLASSES.badge} ${BADGE_COLORS[item.badge]}`}>
            {item.badge}
          </div>
        )}

        {/* Play icon for videos */}
        {item.type === 'video' && (
          <div className={CARD_CLASSES.playIcon}>
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        )}

        {/* Hover overlay */}
        <div className={CARD_CLASSES.overlay} />

        {/* Content on hover */}
        <div className={CARD_CLASSES.content}>
          <h3 className="text-white font-semibold text-base mb-1 line-clamp-1">
            {item.title}
          </h3>
          <p className="text-white/70 text-xs mb-3 line-clamp-2">
            {item.desc}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[var(--gold)] text-sm font-medium">
              <Star className="w-3.5 h-3.5 fill-[var(--gold)]" />
              <span>от {item.priceStars}</span>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors">
              Open
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Hero featured card (larger variant)
export function FeaturedCard({ item }: { item: Item }) {
  return (
    <Link href="/create" className={`${CARD_CLASSES.base} ${CARD_CLASSES.hover} aspect-[2/1] min-h-[400px]`}>
      <div className="relative w-full h-full">
        <img
          src={item.imageUrl}
          alt={item.title}
          className={CARD_CLASSES.image}
          loading="eager"
        />
        
        {item.badge && (
          <div className={`${CARD_CLASSES.badge} ${BADGE_COLORS[item.badge]}`}>
            {item.badge}
          </div>
        )}

        {item.type === 'video' && (
          <div className={CARD_CLASSES.playIcon}>
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        )}

        {/* Always visible gradient on featured */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Content always visible on featured */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-white font-bold text-2xl lg:text-3xl mb-2">
            {item.title}
          </h2>
          <p className="text-white/80 text-base mb-4 max-w-xl">
            {item.desc}
          </p>
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors flex items-center gap-2">
              Get Started
              <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
            </button>
            <div className="text-white/70 text-sm">
              from <span className="text-[var(--gold)] font-semibold">{item.priceStars} ⭐</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
