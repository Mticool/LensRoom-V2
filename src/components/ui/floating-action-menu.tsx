'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Sparkles, Image, Video, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionMenuProps {
  actions?: FloatingAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export function FloatingActionMenu({
  actions,
  position = 'bottom-right',
  className,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultActions: FloatingAction[] = actions || [
    {
      icon: <Sparkles className="w-5 h-5" />,
      label: 'Создать',
      onClick: () => console.log('Generate'),
      color: 'bg-white text-black',
    },
    {
      icon: <Image className="w-5 h-5" />,
      label: 'Фото',
      onClick: () => console.log('Photo'),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
    {
      icon: <Video className="w-5 h-5" />,
      label: 'Видео',
      onClick: () => console.log('Video'),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
    {
      icon: <History className="w-5 h-5" />,
      label: 'История',
      onClick: () => console.log('History'),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
  ];

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
  };

  const handleMainClick = () => {
    setIsOpen(!isOpen);
    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(isOpen ? 10 : 20);
    }
  };

  const handleActionClick = (action: FloatingAction) => {
    action.onClick();
    setIsOpen(false);
    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  return (
    <div
      className={cn(
        'fixed z-50 lg:hidden',
        positionClasses[position],
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
          >
            {defaultActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 h-12',
                  'border border-[var(--border)] shadow-lg backdrop-blur-xl',
                  'active:scale-95 transition-transform',
                  action.color || 'bg-[var(--surface)] text-[var(--text)]'
                )}
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                {action.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={handleMainClick}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-2xl',
          'bg-white text-black border border-gray-200 shadow-lg',
          'active:scale-95 transition-all',
          isOpen && 'rotate-45'
        )}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </motion.button>

      {/* Backdrop overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Alternative: Speed dial FAB (circular menu)
interface SpeedDialProps {
  mainAction: {
    icon: React.ReactNode;
    onClick: () => void;
  };
  actions: FloatingAction[];
  position?: 'bottom-right' | 'bottom-left';
}

export function SpeedDialFAB({ mainAction, actions, position = 'bottom-right' }: SpeedDialProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
  };

  const getPositionForAction = (index: number, total: number) => {
    const angle = (Math.PI / 2 / (total - 1)) * index - Math.PI / 4;
    const radius = 80;
    return {
      x: Math.cos(angle) * radius,
      y: -Math.sin(angle) * radius,
    };
  };

  return (
    <div
      className={cn(
        'fixed z-50 lg:hidden',
        positionClasses[position]
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Speed dial actions */}
      <AnimatePresence>
        {isOpen && (
          <>
            {actions.map((action, index) => {
              const pos = getPositionForAction(index, actions.length);
              return (
                <motion.button
                  key={index}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  animate={{ scale: 1, x: pos.x, y: pos.y, opacity: 1 }}
                  exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'absolute flex items-center justify-center w-12 h-12 rounded-xl',
                    'border border-[var(--border)] shadow-lg backdrop-blur-xl',
                    'active:scale-90 transition-transform',
                    action.color || 'bg-[var(--surface)] text-[var(--text)]'
                  )}
                  title={action.label}
                >
                  {action.icon}
                </motion.button>
              );
            })}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            />
          </>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            mainAction.onClick();
          }
        }}
        onTouchStart={(e) => {
          const touchTimeout = setTimeout(() => setIsOpen(true), 500);
          e.currentTarget.dataset.touchTimeout = String(touchTimeout);
        }}
        onTouchEnd={(e) => {
          const touchTimeout = e.currentTarget.dataset.touchTimeout;
          if (touchTimeout) clearTimeout(Number(touchTimeout));
        }}
        className={cn(
          'relative flex items-center justify-center w-14 h-14 rounded-2xl z-10',
          'bg-white text-black border border-gray-200 shadow-lg',
          'active:scale-95 transition-all'
        )}
      >
        {mainAction.icon}
      </motion.button>
    </div>
  );
}
