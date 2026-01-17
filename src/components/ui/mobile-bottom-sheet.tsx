'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[]; // Height percentages [30, 60, 90]
  defaultSnap?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [40, 70, 95],
  defaultSnap = 1,
  showHandle = true,
  showCloseButton = true,
  className,
}: MobileBottomSheetProps) {
  const [snapIndex, setSnapIndex] = useState(defaultSnap);
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Close if dragged down significantly
    if (offset > 200 || velocity > 500) {
      onClose();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
      return;
    }

    // Snap to nearest point
    const currentHeight = snapPoints[snapIndex];
    const threshold = 15;

    if (offset < -threshold && snapIndex < snapPoints.length - 1) {
      setSnapIndex(snapIndex + 1);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else if (offset > threshold && snapIndex > 0) {
      setSnapIndex(snapIndex - 1);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[98] bg-black/40 backdrop-blur-sm lg:hidden"
        style={{ opacity }}
      />

      {/* Bottom Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0, height: `${snapPoints[snapIndex]}vh` }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[99]',
          'bg-[var(--bg)] rounded-t-3xl',
          'border-t border-[var(--border)] shadow-2xl',
          'flex flex-col overflow-hidden lg:hidden',
          className
        )}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none">
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
            {title && (
              <h3 className="text-lg font-semibold text-[var(--text)]">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  'text-[var(--muted)] hover:text-[var(--text)]',
                  'hover:bg-[var(--surface)] transition-colors',
                  'active:scale-95 touch-manipulation',
                  !title && 'ml-auto'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-6 py-4">{children}</div>
        </div>

        {/* Safe area for home indicator */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </motion.div>
    </>
  );
}

// Alternative: Draggable Sheet with resize handle
interface DraggableSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  initialHeight?: number; // vh units
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

export function DraggableSheet({
  isOpen,
  onClose,
  children,
  title,
  initialHeight = 60,
  minHeight = 30,
  maxHeight = 95,
  className,
}: DraggableSheetProps) {
  const [height, setHeight] = useState(initialHeight);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleDrag = (_: any, info: PanInfo) => {
    if (!isDraggingRef.current) return;

    const windowHeight = window.innerHeight;
    const newHeight = ((windowHeight - info.point.y) / windowHeight) * 100;
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    setHeight(clampedHeight);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    isDraggingRef.current = false;

    // Close if dragged below minimum
    if (height < minHeight + 5 || info.velocity.y > 500) {
      onClose();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } else {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[98] bg-black/40 backdrop-blur-sm lg:hidden"
      />

      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ height: `${height}vh` }}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[99]',
          'bg-[var(--bg)] rounded-t-3xl',
          'border-t border-[var(--border)] shadow-2xl',
          'flex flex-col overflow-hidden lg:hidden',
          className
        )}
      >
        {/* Draggable handle */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripHorizontal className="w-8 h-1.5 text-[var(--border)]" />
        </motion.div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 shrink-0">
            <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
            <button
              onClick={onClose}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg',
                'text-[var(--muted)] hover:text-[var(--text)]',
                'hover:bg-[var(--surface)] transition-colors',
                'active:scale-95 touch-manipulation'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
          {children}
        </div>

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </motion.div>
    </>
  );
}
