'use client';

import { useGenerations } from '@/contexts/generation-context';
import { motion, AnimatePresence } from 'framer-motion';

export function GenerationIndicator() {
  const { generations, activeCount } = useGenerations();

  const activeGenerations = generations.filter(g => g.status === 'processing');

  if (activeCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl min-w-[280px]">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <div className="w-3 h-3 bg-[#CCFF00] rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-[#CCFF00] rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-white font-medium">
              Генерация ({activeCount})
            </span>
          </div>

          <div className="space-y-2">
            {activeGenerations.slice(0, 3).map(gen => (
              <div key={gen.id} className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {gen.type === 'video' ? '🎬' : '🖼️'}
                  </span>
                  <span className="text-sm text-gray-300 truncate flex-1">
                    {gen.prompt.slice(0, 30)}...
                  </span>
                </div>
                
                <div className="relative h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[#CCFF00] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${gen.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {gen.progress}%
                </div>
              </div>
            ))}

            {activeCount > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{activeCount - 3} ещё...
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
