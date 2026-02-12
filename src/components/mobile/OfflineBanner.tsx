/**
 * Banner shown when user is offline
 */

'use client';

import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe"
        >
          <div className="mt-2 mx-auto max-w-md rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  Нет подключения к интернету
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  Некоторые функции недоступны
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
