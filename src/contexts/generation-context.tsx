'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Generation {
  id: string;
  taskId: string;
  type: 'photo' | 'video';
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  results?: string[];
  error?: string;
  startedAt: number;
}

interface GenerationContextType {
  generations: Generation[];
  addGeneration: (gen: Omit<Generation, 'status' | 'progress' | 'startedAt'>) => void;
  removeGeneration: (id: string) => void;
  activeCount: number;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const pollIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const activeCount = generations.filter(g => g.status === 'processing').length;

  const pollStatus = useCallback(async (gen: Generation) => {
    try {
      const response = await fetch(`/api/generate/status?taskId=${gen.taskId}`);
      const data = await response.json();

      setGenerations(prev => prev.map(g => {
        if (g.id !== gen.id) return g;

        if (data.status === 'completed' && data.results?.length > 0) {
          // Clear polling
          const interval = pollIntervals.current.get(gen.id);
          if (interval) {
            clearInterval(interval);
            pollIntervals.current.delete(gen.id);
          }

          // Show success notification
          const emoji = gen.type === 'video' ? '🎬' : '🖼️';
          const typeText = gen.type === 'video' ? 'Видео' : 'Фото';
          
          toast.success(
            <div className="flex flex-col gap-1">
              <span className="font-medium">{emoji} {typeText} готово!</span>
              <span className="text-sm text-gray-400 truncate max-w-[200px]">{gen.prompt}</span>
            </div>,
            {
              duration: 10000,
              action: {
                label: 'Смотреть',
                onClick: () => window.location.href = '/library',
              },
            }
          );

          return {
            ...g,
            status: 'completed' as const,
            progress: 100,
            results: data.results,
          };
        }

        if (data.status === 'failed') {
          // Clear polling
          const interval = pollIntervals.current.get(gen.id);
          if (interval) {
            clearInterval(interval);
            pollIntervals.current.delete(gen.id);
          }

          // Show error notification
          toast.error(
            <div className="flex flex-col gap-1">
              <span className="font-medium">❌ Ошибка генерации</span>
              <span className="text-sm text-gray-400">{data.error || 'Попробуйте снова'}</span>
            </div>,
            { duration: 8000 }
          );

          return {
            ...g,
            status: 'failed' as const,
            error: data.error,
          };
        }

        // Still processing
        return {
          ...g,
          progress: data.progress || g.progress,
        };
      }));

    } catch (error) {
      console.error('Poll error:', error);
    }
  }, []);

  const addGeneration = useCallback((gen: Omit<Generation, 'status' | 'progress' | 'startedAt'>) => {
    const newGen: Generation = {
      ...gen,
      status: 'processing',
      progress: 0,
      startedAt: Date.now(),
    };

    setGenerations(prev => [...prev, newGen]);

    // Show started notification
    const emoji = gen.type === 'video' ? '🎬' : '🖼️';
    const typeText = gen.type === 'video' ? 'Видео' : 'Фото';
    toast.info(`${emoji} ${typeText} генерируется в фоне...`, { duration: 3000 });

    // Start polling
    const pollInterval = gen.type === 'video' ? 5000 : 3000;
    const interval = setInterval(() => pollStatus(newGen), pollInterval);
    pollIntervals.current.set(gen.id, interval);

    // Initial poll
    setTimeout(() => pollStatus(newGen), 1000);
  }, [pollStatus]);

  const removeGeneration = useCallback((id: string) => {
    // Clear polling
    const interval = pollIntervals.current.get(id);
    if (interval) {
      clearInterval(interval);
      pollIntervals.current.delete(id);
    }

    setGenerations(prev => prev.filter(g => g.id !== id));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollIntervals.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Auto-remove completed generations after 5 minutes
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setGenerations(prev => 
        prev.filter(g => 
          g.status === 'processing' || g.startedAt > fiveMinutesAgo
        )
      );
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <GenerationContext.Provider value={{ generations, addGeneration, removeGeneration, activeCount }}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGenerations() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGenerations must be used within GenerationProvider');
  }
  return context;
}
