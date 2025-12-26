'use client';

import { useState, useEffect, useCallback } from 'react';
import { GenerationResult, GeneratorMode, GenerationSettings } from '../GeneratorV2';

export function useHistory(mode: GeneratorMode) {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const type = mode === 'video' ? 'video' : 'photo';
      const response = await fetch(`/api/generations?type=${type}&limit=50`);
      
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
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback((result: GenerationResult) => {
    setHistory(prev => [result, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    // Only clear local state, not database
    setHistory([]);
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    clearHistory,
    refresh: fetchHistory,
  };
}


