'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Generation {
  id: string;
  type: 'photo' | 'video' | 'text' | 'audio';
  model_id: string;
  model_name: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  credits_used?: number;
  asset_url?: string;
  thumbnail_url?: string;
  preview_url?: string;
  error?: string;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  telegramId?: string;
  username?: string;
  firstName?: string;
  photoUrl?: string;
  isAdmin?: boolean;
  role?: string;
}

export interface GeneratorState {
  user: User | null;
  balance: number;
  generations: Generation[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useGenerator() {
  const [state, setState] = useState<GeneratorState>({
    user: null,
    balance: 0,
    generations: [],
    isLoading: true,
    isAuthenticated: false,
  });

  // Fetch user info
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
        }));
        return data.user;
      } else {
        setState(prev => ({ ...prev, isAuthenticated: false, user: null }));
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setState(prev => ({ ...prev, isAuthenticated: false, user: null }));
      return null;
    }
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/balance');
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, balance: data.balance || 0 }));
        return data.balance;
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
    return 0;
  }, []);

  // Fetch generations history (using new /api/history endpoint)
  const fetchGenerations = useCallback(async (filters?: {
    type?: 'photo' | 'video' | 'text' | 'audio';
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));
      
      const res = await fetch(`/api/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setState(prev => ({ ...prev, generations: data.generations || [] }));
        return data.generations;
      }
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    }
    return [];
  }, []);

  // Create generation
  const createGeneration = useCallback(async (input: {
    type: 'photo' | 'video' | 'text' | 'audio';
    modelId: string;
    prompt: string;
    aspectRatio?: string;
  }) => {
    try {
      const res = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add to local state
        setState(prev => ({
          ...prev,
          generations: [data.generation, ...prev.generations],
        }));
        return data.generation;
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create generation');
      }
    } catch (error) {
      console.error('Failed to create generation:', error);
      throw error;
    }
  }, []);

  // Update generation
  const updateGeneration = useCallback(async (id: string, updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    results?: Array<{ url: string; thumbnail?: string }>;
    thumbnailUrl?: string;
    creditsUsed?: number;
    taskId?: string;
    error?: string;
  }) => {
    try {
      const res = await fetch('/api/generations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update local state
        setState(prev => ({
          ...prev,
          generations: prev.generations.map(g => 
            g.id === id ? data.generation : g
          ),
        }));
        return data.generation;
      }
    } catch (error) {
      console.error('Failed to update generation:', error);
    }
  }, []);

  // Universal generate method (using new /api/generate endpoint)
  const generate = useCallback(async (params: {
    type: 'text' | 'image' | 'video' | 'audio';
    prompt: string;
    modelId: string;
    settings: Record<string, any>;
    files?: File[];
  }) => {
    try {
      // Convert files to base64 if needed
      const filesData: string[] = [];
      if (params.files) {
        for (const file of params.files) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          filesData.push(base64);
        }
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: params.type,
          model: params.modelId,
          prompt: params.prompt,
          settings: params.settings,
          files: filesData.length > 0 ? filesData : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await res.json();
      
      // Refresh balance and generations
      await Promise.all([
        fetchBalance(),
        fetchGenerations({ limit: 50 }),
      ]);

      return {
        generationId: data.generationId,
        status: data.status,
        jobId: data.jobId,
        resultUrl: data.resultUrl,
        costStars: data.costStars,
      };
    } catch (error) {
      console.error('Failed to generate:', error);
      throw error;
    }
  }, [fetchBalance, fetchGenerations]);

  // Generate image (legacy wrapper)
  const generateImage = useCallback(async (params: {
    prompt: string;
    modelId: string;
    settings: Record<string, any>;
    files?: File[];
  }) => {
    return generate({
      type: 'image',
      prompt: params.prompt,
      modelId: params.modelId,
      settings: params.settings,
      files: params.files,
    });
  }, [generate]);

  // Generate video (legacy wrapper)
  const generateVideo = useCallback(async (params: {
    prompt: string;
    modelId: string;
    settings: Record<string, any>;
    files?: File[];
  }) => {
    return generate({
      type: 'video',
      prompt: params.prompt,
      modelId: params.modelId,
      settings: params.settings,
      files: params.files,
    });
  }, [generate]);

  // Generate text
  const generateText = useCallback(async (params: {
    prompt: string;
    modelId: string;
    settings: Record<string, any>;
  }) => {
    return generate({
      type: 'text',
      prompt: params.prompt,
      modelId: params.modelId,
      settings: params.settings,
    });
  }, [generate]);

  // Generate audio
  const generateAudio = useCallback(async (params: {
    prompt: string;
    modelId: string;
    settings: Record<string, any>;
  }) => {
    return generate({
      type: 'audio',
      prompt: params.prompt,
      modelId: params.modelId,
      settings: params.settings,
    });
  }, [generate]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string, generationId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        
        if (data.status === 'completed' && data.resultUrl) {
          await updateGeneration(generationId, {
            status: 'completed',
            results: [{ url: data.resultUrl }],
            thumbnailUrl: data.thumbnailUrl || data.resultUrl,
          });
          return 'completed';
        } else if (data.status === 'failed') {
          await updateGeneration(generationId, {
            status: 'failed',
            error: data.error || 'Generation failed',
          });
          return 'failed';
        }
        
        return data.status;
      }
    } catch (error) {
      console.error('Failed to poll job status:', error);
    }
    return 'processing';
  }, [updateGeneration]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const user = await fetchUser();
      
      if (user) {
        await Promise.all([
          fetchBalance(),
          fetchGenerations({ limit: 50 }),
        ]);
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
    };

    init();
  }, [fetchUser, fetchBalance, fetchGenerations]);

  return {
    ...state,
    fetchUser,
    fetchBalance,
    fetchGenerations,
    createGeneration,
    updateGeneration,
    generate, // Universal generate method
    generateImage,
    generateVideo,
    generateText,
    generateAudio,
    pollJobStatus,
  };
}
