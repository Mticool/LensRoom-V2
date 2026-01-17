'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SwipeableTab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface SwipeableTabsProps {
  tabs: SwipeableTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  showIndicator?: boolean;
}

export function SwipeableTabs({
  tabs,
  defaultTab,
  onTabChange,
  className,
  showIndicator = true,
}: SwipeableTabsProps) {
  const [activeIndex, setActiveIndex] = useState(
    defaultTab ? tabs.findIndex(t => t.id === defaultTab) : 0
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = containerWidth * 0.2;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }

    if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
      if (offset > 0 && activeIndex > 0) {
        // Swipe right - previous tab
        setActiveIndex(activeIndex - 1);
        onTabChange?.(tabs[activeIndex - 1].id);
      } else if (offset < 0 && activeIndex < tabs.length - 1) {
        // Swipe left - next tab
        setActiveIndex(activeIndex + 1);
        onTabChange?.(tabs[activeIndex + 1].id);
      }
    }
  };

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    onTabChange?.(tabs[index].id);
    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Tab headers */}
      <div className="relative flex items-center border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="flex w-full overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(index)}
              className={cn(
                'relative flex items-center justify-center gap-2 px-4 py-3 min-w-[80px]',
                'text-sm font-medium transition-colors whitespace-nowrap',
                'active:scale-95 transition-transform touch-manipulation',
                activeIndex === index
                  ? 'text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Active tab indicator */}
        {showIndicator && (
          <motion.div
            className="absolute bottom-0 h-0.5 bg-white"
            initial={false}
            animate={{
              left: `${(activeIndex / tabs.length) * 100}%`,
              width: `${100 / tabs.length}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </div>

      {/* Tab content with swipe gesture */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <motion.div
          className="flex h-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          animate={{ x: -activeIndex * containerWidth }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ x }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="w-full h-full shrink-0"
              style={{ width: containerWidth || '100%' }}
            >
              {tab.content}
            </div>
          ))}
        </motion.div>

        {/* Swipe indicator dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 rounded-full bg-black/20 backdrop-blur-sm">
          {tabs.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                activeIndex === index ? 'bg-white' : 'bg-white/40'
              )}
              animate={{
                scale: activeIndex === index ? 1.2 : 1,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Alternative: Segmented Control (iOS-style)
interface SegmentedControlProps {
  segments: { id: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl({
  segments,
  value,
  onChange,
  fullWidth = true,
  className,
}: SegmentedControlProps) {
  const activeIndex = segments.findIndex(s => s.id === value);

  return (
    <div
      className={cn(
        'inline-flex p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]',
        fullWidth && 'w-full',
        className
      )}
    >
      {segments.map((segment, index) => (
        <button
          key={segment.id}
          onClick={() => {
            onChange(segment.id);
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate(10);
            }
          }}
          className={cn(
            'relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
            'text-sm font-medium transition-all touch-manipulation',
            'active:scale-95',
            fullWidth && 'flex-1',
            value === segment.id
              ? 'text-black'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          )}
        >
          {value === segment.id && (
            <motion.div
              layoutId="activeSegment"
              className="absolute inset-0 bg-white rounded-lg shadow-sm"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {segment.icon && <span className="w-4 h-4">{segment.icon}</span>}
            {segment.label}
          </span>
        </button>
      ))}
    </div>
  );
}
