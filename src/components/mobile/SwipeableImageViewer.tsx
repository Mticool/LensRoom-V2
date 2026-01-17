/**
 * Swipeable image viewer with pinch-to-zoom and long-press support
 */

'use client';

import { useState } from 'react';
import { X, Download, Share2, Heart } from 'lucide-react';
import { useSwipe } from '@/lib/hooks/useSwipe';
import { usePinchZoom } from '@/lib/hooks/usePinchZoom';
import { useLongPress } from '@/lib/hooks/useLongPress';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SwipeableImageViewerProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SwipeableImageViewer({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: SwipeableImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);

  const currentImage = images[currentIndex];
  const hasNext = currentIndex < images.length - 1;
  const hasPrev = currentIndex > 0;

  // Swipe gestures
  const swipeBind = useSwipe({
    onSwipeLeft: () => {
      if (hasNext) {
        setCurrentIndex(prev => prev + 1);
      }
    },
    onSwipeRight: () => {
      if (hasPrev) {
        setCurrentIndex(prev => prev - 1);
      }
    },
    onSwipeDown: () => {
      onClose();
    },
    threshold: 50,
    haptic: true,
  });

  // Pinch to zoom
  const { bind: pinchBind, zoom, resetZoom } = usePinchZoom({
    minZoom: 1,
    maxZoom: 3,
    initialZoom: 1,
  });

  // Long press to show options
  const longPressBind = useLongPress({
    onLongPress: () => {
      toast.success('Long press detected!');
      // Show options menu
    },
    threshold: 500,
    haptic: true,
    hapticPattern: 'medium',
  });

  // Combine all gesture bindings
  const gestureBind = () => ({
    ...swipeBind(),
    ...pinchBind(),
    ...longPressBind(),
  });

  const handleDownload = () => {
    toast.success('Downloading image...');
  };

  const handleShare = () => {
    toast.success('Share feature coming soon!');
  };

  const handleLike = () => {
    toast.success('Added to favorites!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* Header */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 pt-safe"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-6 h-6 text-white" />
                </button>

                <div className="text-white text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </div>

                <div className="w-10" /> {/* Spacer */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image with gestures */}
        <div
          {...gestureBind()}
          className="w-full h-full flex items-center justify-center touch-none"
          onClick={() => setShowControls(prev => !prev)}
        >
          <motion.img
            key={currentIndex}
            src={currentImage}
            alt={`Image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: zoom }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Bottom controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-safe"
            >
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handleLike}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Heart className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={handleDownload}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Download className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={handleShare}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Share2 className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Navigation hints */}
              <div className="mt-4 text-center text-xs text-white/60 space-y-1">
                <p>Swipe left/right to navigate • Pinch to zoom</p>
                <p>Long press for options • Swipe down to close</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation indicators */}
        <div className="absolute bottom-24 left-0 right-0 flex items-center justify-center gap-1.5 pb-safe">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
