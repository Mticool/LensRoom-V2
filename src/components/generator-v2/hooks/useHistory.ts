'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GenerationResult, GeneratorMode, GenerationSettings } from '../GeneratorV2';

export function useHistory(mode: GeneratorMode) {
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
      const response = await fetch(`/api/generations?type=${type}&limit=50`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      
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
  }, [mode]);

  useEffect(() => {
    fetchHistory();

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mode]);

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

  return {
    history,
    isLoading,
    addToHistory,
    addPendingToHistory,
    removePendingFromHistory,
    clearHistory,
    refresh: fetchHistory,
  };
}



