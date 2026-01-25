'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedJson, invalidateCached } from '@/lib/client/generations-cache';
import { GenerationResult, GeneratorMode, GenerationSettings } from '../GeneratorV2';

const PAGE_SIZE = 20;

function normalizeAspectRatio(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "1:1";
  const m = raw.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
  if (!m) return raw;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return raw;
  return `${w}:${h}`;
}

export function useHistory(mode: GeneratorMode, modelId?: string, threadId?: string) {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Transform API response to GenerationResult format
  const transformResults = useCallback((generations: any[]): GenerationResult[] => {
    return (generations || []).map((gen: any): GenerationResult => ({
      id: gen.id,
      url: gen.result_urls?.[0] || '',
      prompt: gen.prompt || '',
      mode: (gen.type === 'video' ? 'video' : 'image') as GeneratorMode,
      settings: {
        model: gen.model_id || '',
        size: normalizeAspectRatio(gen.aspect_ratio),
        quality: gen?.params?.quality || undefined,
        outputFormat: gen?.params?.outputFormat || undefined,
        negativePrompt: gen.negative_prompt || undefined,
      } as GenerationSettings,
      timestamp: new Date(gen.created_at).getTime(),
      previewUrl: gen.preview_url || gen.result_urls?.[0] || '',
      status: gen.status,
    })).filter((r) => r.status === 'success' && r.url);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      setOffset(0);
      
      // Load history for current user (threadId is optional filter)
      
      const type = mode === 'video' ? 'video' : 'photo';
      const cacheKey = `history-${type}${modelId ? `-${modelId}` : ''}${threadId ? `-${threadId}` : ''}`;
      
      // Use cached fetch with 5s TTL
      const data = await cachedJson(cacheKey, async () => {
        const url = (() => {
          const qs = new URLSearchParams();
          qs.set("type", type);
          qs.set("limit", String(PAGE_SIZE));
          qs.set("offset", "0");
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
      
      const results = transformResults(data.generations);
      // Reverse so oldest items are at top (beginning of array)
      // and newest at bottom (end of array, near prompt input)
      setHistory(results.reverse());
      // If we got exactly PAGE_SIZE results, there might be more
      setHasMore((data.generations || []).length >= PAGE_SIZE);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch history:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, modelId, threadId, transformResults]);

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const newOffset = offset + PAGE_SIZE;
      const type = mode === 'video' ? 'video' : 'photo';
      
      const qs = new URLSearchParams();
      qs.set("type", type);
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(newOffset));
      if (modelId) qs.set("model_id", modelId);
      if (threadId) qs.set("thread_id", threadId);
      
      const response = await fetch(`/api/generations?${qs.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load more history');
      }
      
      const data = await response.json();
      const results = transformResults(data.generations);
      
      // Reverse to maintain consistent order (oldest first)
      // then prepend to the beginning (top of gallery)
      setHistory(prev => [...results.reverse(), ...prev]);
      setOffset(newOffset);
      // If we got less than PAGE_SIZE, no more items
      setHasMore((data.generations || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, offset, mode, modelId, threadId, transformResults]);

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
      // Add new results at the end (bottom of gallery)
      setHistory(prev => [...prev, result]);
    }
  }, []);
  
  // Add a pending placeholder to history (at the end/bottom)
  const addPendingToHistory = useCallback((result: GenerationResult) => {
    setHistory(prev => [...prev, result]);
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
    // Invalidate all caches for this type (including different models and threads)
    invalidateCached(`history-${type}`);
    // Also invalidate specific cache for current model/thread if exists
    if (modelId || threadId) {
      const specificKey = `history-${type}${modelId ? `-${modelId}` : ''}${threadId ? `-${threadId}` : ''}`;
      invalidateCached(specificKey);
    }
  }, [mode, modelId, threadId]);

  return {
    history,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addToHistory,
    addPendingToHistory,
    removePendingFromHistory,
    clearHistory,
    refresh: fetchHistory,
    invalidateCache: invalidateHistoryCache,
  };
}
