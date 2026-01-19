'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedJson, invalidateCached } from '@/lib/client/generations-cache';
import { GenerationResult, GeneratorMode, GenerationSettings } from '../GeneratorV2';

export function useHistory(mode: GeneratorMode, modelId?: string, threadId?: string) {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      const type = mode === 'video' ? 'video' : 'photo';
      const cacheKey = `history-${type}${modelId ? `-${modelId}` : ''}${threadId ? `-${threadId}` : ''}`;
      
      // Use cached fetch with 5s TTL
      const data = await cachedJson(cacheKey, async () => {
        const url = (() => {
          const qs = new URLSearchParams();
          qs.set("type", type);
          qs.set("limit", "50");
          if (modelId) qs.set("model_id", modelId);
          if (threadId) qs.set("thread_id", threadId);
          return `/api/generations?${qs.toString()}`;
        })();
        
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }

        return response.json();
      });
      
      // Transform API response to GenerationResult format
      const results: GenerationResult[] = (data.generations || []).map((gen: any) => ({
        id: gen.id,
        url: gen.result_urls?.[0] || '',
        prompt: gen.prompt || '',
        mode: gen.type === 'video' ? 'video' : 'image',
        settings: {
          model: gen.model_id || '',
          size: gen.aspect_ratio || '1:1',
        } as GenerationSettings,
        timestamp: new Date(gen.created_at).getTime(),
        previewUrl: gen.preview_url || gen.result_urls?.[0] || '',
        status: gen.status,
      }));

      setHistory(results.filter(r => r.status === 'success' && r.url));
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch history:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, modelId, threadId]);

  useEffect(() => {
    fetchHistory();

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchHistory]);

  const addToHistory = useCallback((result: GenerationResult) => {
    // If result has pendingId, update the pending item instead of adding new
    if (result.pendingId) {
      setHistory(prev => prev.map(item => 
        item.id === result.pendingId
          ? { ...result, id: result.id } // Replace with real result
          : item
      ));
    } else {
      setHistory(prev => [result, ...prev]);
    }
  }, []);
  
  // Add a pending placeholder to history
  const addPendingToHistory = useCallback((result: GenerationResult) => {
    setHistory(prev => [result, ...prev]);
  }, []);
  
  // Remove a pending item from history (e.g., on error)
  const removePendingFromHistory = useCallback((pendingId: string) => {
    setHistory(prev => prev.filter(item => item.id !== pendingId));
  }, []);

  const clearHistory = useCallback(() => {
    // Only clear local state, not database
    setHistory([]);
  }, []);
  
  // Invalidate cache when new generation is added
  const invalidateHistoryCache = useCallback(() => {
    const type = mode === 'video' ? 'video' : 'photo';
    invalidateCached(`history-${type}`);
  }, [mode]);

  return {
    history,
    isLoading,
    addToHistory,
    addPendingToHistory,
    removePendingFromHistory,
    clearHistory,
    refresh: fetchHistory,
    invalidateCache: invalidateHistoryCache,
  };
}



