'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cachedJson, invalidateCached } from '@/lib/client/generations-cache';
import { GenerationResult, GeneratorMode, GenerationSettings } from '../GeneratorV2';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';

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

  // Helper function to get asset URL with fallback priority (similar to getSourceAssetUrl)
  const getAssetUrl = useCallback((gen: any): string => {
    // Check if we have external URL from temporary domain (tempfile.aiquickdraw.com)
    // These URLs expire over time, so prefer reliable proxy endpoint
    const externalUrls = [
      gen.asset_url,
      gen.result_url,
      gen.result_urls,
      gen.thumbnail_url,
      gen.preview_url
    ].filter(Boolean);

    const hasExpirableUrl = externalUrls.some(url => {
      if (typeof url === 'string') {
        return url.includes('tempfile.aiquickdraw.com');
      }
      return false;
    });

    // If we have expirable external URL and a valid ID, prefer proxy endpoint for reliability
    if (hasExpirableUrl && gen.id && gen.status === 'success') {
      return `/api/generations/${encodeURIComponent(gen.id)}/download?kind=original&proxy=1`;
    }

    // Otherwise use normal priority chain
    // Priority 1: asset_url
    if (gen.asset_url && typeof gen.asset_url === 'string') {
      return gen.asset_url;
    }

    // Priority 2: result_url
    if (gen.result_url && typeof gen.result_url === 'string') {
      return gen.result_url;
    }

    // Priority 3: result_urls[0]
    if (gen.result_urls) {
      if (Array.isArray(gen.result_urls) && gen.result_urls.length > 0) {
        const first = gen.result_urls[0];
        if (typeof first === 'string') return first;
      }
      if (typeof gen.result_urls === 'string') {
        // Might be JSON string
        try {
          const parsed = JSON.parse(gen.result_urls);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed[0];
          }
        } catch {
          // If not JSON, treat as single URL
          return gen.result_urls;
        }
      }
    }

    // Priority 4: thumbnail_url
    if (gen.thumbnail_url && typeof gen.thumbnail_url === 'string') {
      return gen.thumbnail_url;
    }

    // Priority 5: preview_url
    if (gen.preview_url && typeof gen.preview_url === 'string') {
      return gen.preview_url;
    }

    // Priority 6: Parse JSON columns (output/result/data) for URLs
    const jsonColumns = [gen.output, gen.result, gen.data];
    for (const col of jsonColumns) {
      if (!col) continue;
      const str = typeof col === 'string' ? col : JSON.stringify(col);
      const urlMatch = str.match(/https:\/\/[^\s"']+/);
      if (urlMatch) return urlMatch[0];
    }

    // Priority 7: Use download endpoint if we have an ID but no direct URL
    // Use proxy=1 to get direct image data instead of redirect
    if (gen.id && gen.status === 'success') {
      // Try preview first, fallback to original
      return `/api/generations/${encodeURIComponent(gen.id)}/download?kind=preview&proxy=1`;
    }

    return '';
  }, []);

  // Transform API response to GenerationResult format
  const transformResults = useCallback((generations: any[]): GenerationResult[] => {
    return (generations || []).flatMap((gen: any): GenerationResult[] => {
      // Check if this generation has multiple URLs (e.g. Grok returns 6 images)
      let urls: string[] = [];

      // Extract all URLs from result_urls array
      if (gen.result_urls) {
        if (Array.isArray(gen.result_urls)) {
          urls = gen.result_urls.filter((url: any) => typeof url === 'string' && url.trim().length > 0);
        } else if (typeof gen.result_urls === 'string') {
          try {
            const parsed = JSON.parse(gen.result_urls);
            if (Array.isArray(parsed)) {
              urls = parsed.filter((url: any) => typeof url === 'string' && url.trim().length > 0);
            }
          } catch {
            // If not JSON, might be a single URL
            urls = [gen.result_urls];
          }
        }
      }

      // If we have multiple URLs, create a GenerationResult for each one
      if (urls.length > 1) {
        const normalizedSize = normalizeAspectRatio(gen.aspect_ratio);
        if (process.env.NODE_ENV === 'development') {
          console.log('[useHistory] Multi-URL generation:', {
            id: gen.id,
            model: gen.model_id,
            aspect_ratio_raw: gen.aspect_ratio,
            aspect_ratio_normalized: normalizedSize,
          });
        }
        return urls.map((url, index) => ({
          id: `${gen.id}-${index}`,
          url: url,
          previewUrl: url, // Use same URL for preview
          prompt: gen.prompt || '',
          mode: (gen.type === 'video' ? 'video' : 'image') as GeneratorMode,
          settings: {
            model: gen.model_id || '',
            size: normalizedSize,
            quality: gen?.params?.quality || undefined,
            outputFormat: gen?.params?.outputFormat || undefined,
            negativePrompt: gen.negative_prompt || undefined,
          } as GenerationSettings,
          timestamp: gen.created_at ? new Date(gen.created_at).getTime() : Date.now(),
          status: (gen.status === 'success' || gen.status === 'completed') ? 'completed' : gen.status,
        }));
      }

      // Otherwise, use normal single-URL logic
      const assetUrl = getAssetUrl(gen);

      // For previewUrl, prefer preview_url, then assetUrl, then download endpoint with proxy
      let previewUrl = gen.preview_url || assetUrl;
      if (!previewUrl && gen.id && gen.status === 'success') {
        // Use download endpoint with proxy=1 to get direct image data
        previewUrl = `/api/generations/${encodeURIComponent(gen.id)}/download?kind=preview&proxy=1`;
      }

      // If we still don't have a URL but have an ID, use download endpoint with proxy for original
      // Also ensure we have at least some URL for display
      let finalUrl = assetUrl;
      if (!finalUrl && gen.id && gen.status === 'success') {
        // Try original with proxy first
        finalUrl = `/api/generations/${encodeURIComponent(gen.id)}/download?kind=original&proxy=1`;
      }

      // If previewUrl is empty but we have finalUrl, use it
      if (!previewUrl && finalUrl) {
        previewUrl = finalUrl;
      }

      return [{
        id: gen.id,
        url: finalUrl,
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
        previewUrl: previewUrl || finalUrl, // Ensure previewUrl is always set if we have any URL
        status: gen.status,
      }];
    }).filter((r) => {
      // Only show items with success/completed status and either URL or ID (for download endpoint)
      const isSuccess = r.status === 'success' || r.status === 'completed';
      const hasMedia = !!(r.url || r.previewUrl || r.id);
      return isSuccess && hasMedia;
    });
  }, [getAssetUrl]);

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
        
        const response = await fetchWithTimeout(url, {
          timeout: 15_000,
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
        if (error instanceof FetchTimeoutError) {
          console.warn('[useHistory] History request timed out');
        }
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
      
      const response = await fetchWithTimeout(`/api/generations?${qs.toString()}`, { timeout: 15_000 });
      
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

  return useMemo(() => ({
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
  }), [
    history,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addToHistory,
    addPendingToHistory,
    removePendingFromHistory,
    clearHistory,
    fetchHistory,
    invalidateHistoryCache,
  ]);
}
