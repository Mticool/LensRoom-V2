'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

interface UseSimpleHistoryOptions {
  modelId?: string;
  threadId?: string;
}

/**
 * Simple history hook WITHOUT reverse logic
 *
 * Order principle:
 * - DB returns: ORDER BY created_at DESC → [newest, ..., oldest]
 * - We store as-is: [newest, ..., oldest]
 * - Render as-is: newest at top, oldest at bottom
 * - Wait... that's WRONG! We want newest at BOTTOM!
 *
 * CORRECT approach:
 * - DB returns: ORDER BY created_at ASC → [oldest, ..., newest]
 * - We store as-is: [oldest, ..., newest]
 * - Render as-is: oldest at top, newest at bottom ✅
 * - addNew() adds to END → appears at bottom ✅
 * - loadMore() adds to START → appears at top ✅
 */
export function useSimpleHistory({ modelId, threadId }: UseSimpleHistoryOptions = {}) {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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
        quality: gen.quality,
      } as GenerationSettings,
      timestamp: new Date(gen.created_at).getTime(),
      previewUrl: gen.preview_url || gen.result_urls?.[0] || '',
      status: gen.status,
    })).filter((r) => r.status === 'success' && r.url);
  }, []);

  // Load initial history
  const loadInitial = useCallback(async () => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);

      // If no threadId, don't load history (new chat = empty gallery)
      if (!threadId) {
        setHistory([]);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const qs = new URLSearchParams();
      qs.set("type", "photo"); // NanoBanana Pro is image only
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", "0");
      if (modelId) qs.set("model_id", modelId);
      if (threadId) qs.set("thread_id", threadId);
      // IMPORTANT: Request ASC order so we get [oldest, ..., newest]
      qs.set("order", "asc");

      const response = await fetch(`/api/generations?${qs.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      const results = transformResults(data.generations);

      // Store as-is: [oldest, ..., newest]
      // NO REVERSE! This is the key fix
      setHistory(results);
      setHasMore((data.generations || []).length >= PAGE_SIZE);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch history:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [modelId, threadId, transformResults]);

  // Load more (older) items
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || history.length === 0) return;

    try {
      setIsLoadingMore(true);

      // Get the OLDEST item's timestamp (first in array)
      const oldest = history[0];
      const oldestTimestamp = new Date(oldest.timestamp).toISOString();

      const qs = new URLSearchParams();
      qs.set("type", "photo");
      qs.set("limit", String(PAGE_SIZE));
      qs.set("before", oldestTimestamp); // Get items before oldest
      if (modelId) qs.set("model_id", modelId);
      if (threadId) qs.set("thread_id", threadId);
      qs.set("order", "asc");

      const response = await fetch(`/api/generations?${qs.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to load more history');
      }

      const data = await response.json();
      const results = transformResults(data.generations);

      // Add older items to the START (top of gallery)
      // results are already in ASC order [even_older, ..., old]
      setHistory(prev => [...results, ...prev]);
      setHasMore((data.generations || []).length >= PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more history:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, history, modelId, threadId, transformResults]);

  // Add new generation to history
  const addNew = useCallback((result: GenerationResult) => {
    // Add to END of array → visually appears at BOTTOM (near prompt)
    setHistory(prev => [...prev, result]);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHasMore(false);
  }, []);

  // Refresh/reload history
  const refresh = useCallback(() => {
    loadInitial();
  }, [loadInitial]);

  // Load initial history on mount or when deps change
  useEffect(() => {
    loadInitial();

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadInitial]);

  return {
    history,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addNew,
    clearHistory,
    refresh,
  };
}
