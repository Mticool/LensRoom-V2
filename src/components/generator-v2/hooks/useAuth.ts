'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import logger from '@/lib/logger';
import { useCreditsStore } from '@/stores/credits-store';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  credits: number;
  userId: string | null;
  username: string | null;
  role: 'user' | 'manager' | 'admin';
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    credits: 0,
    userId: null,
    username: null,
    role: 'user',
  });

  const checkAuth = useCallback(async () => {
    try {
      console.log('[useAuth] Starting auth check...');
      // Use optimized fetch with deduplication and retry
      const response = await apiFetch('/api/auth/me', {
        dedupe: true,
        retry: {
          maxRetries: 2,
          initialDelay: 500,
        },
      });

      console.log('[useAuth] /api/auth/me response:', response.status, response.ok);

      if (!response.ok) {
        console.log('[useAuth] Auth failed - setting isAuthenticated=false');
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          credits: 0,
          userId: null,
          username: null,
          role: 'user',
        });
        return;
      }

      const data = await response.json();
      console.log('[useAuth] Auth data:', { hasUser: !!data.user, hasTelegramId: !!data.telegramId, username: data.username });

      // API returns { user: { id }, telegramId, username, firstName, role, ... }
      if (data.user || data.telegramId) {
        // Fetch credits separately with deduplication
        let credits = 0;
        let subscriptionStars: number | undefined;
        let packageStars: number | undefined;
        try {
          const creditsRes = await apiFetch('/api/credits/balance', {
            dedupe: true,
            retry: {
              maxRetries: 2,
              initialDelay: 500,
            },
          });
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            credits = creditsData.balance || creditsData.credits || 0;
            if (typeof creditsData.subscriptionStars === 'number') subscriptionStars = creditsData.subscriptionStars;
            if (typeof creditsData.packageStars === 'number') packageStars = creditsData.packageStars;
            console.log('[useAuth] Credits fetched:', credits);
          }
        } catch {
          // ignore credits fetch error
          console.log('[useAuth] Credits fetch failed, using 0');
        }

        console.log('[useAuth] Setting isAuthenticated=true, credits=', credits);
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          credits,
          userId: data.user?.id || data.telegramId,
          username: data.username || data.firstName || null,
          role: data.role || 'user',
        });

        // Sync to global header/store
        try {
          useCreditsStore.getState().setBalance(Number(credits) || 0, subscriptionStars, packageStars);
        } catch {
          // ignore cross-store sync errors
        }
      } else {
        console.log('[useAuth] No user/telegramId in response - setting isAuthenticated=false');
        setAuth({
          isAuthenticated: false,
          isLoading: false,
          credits: 0,
          userId: null,
          username: null,
          role: 'user',
        });
      }
    } catch (error) {
      console.error('[useAuth] Auth check failed with error:', error);
      logger.error('Auth check failed:', error);
      setAuth(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/credits/balance', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const nextCredits = data.balance || data.credits || 0;
        setAuth(prev => ({
          ...prev,
          credits: nextCredits,
        }));

        // Sync to global header/store (Header uses useCreditsStore)
        try {
          useCreditsStore.getState().setBalance(
            Number(nextCredits) || 0,
            typeof data.subscriptionStars === 'number' ? data.subscriptionStars : undefined,
            typeof data.packageStars === 'number' ? data.packageStars : undefined
          );
        } catch {
          // ignore cross-store sync errors
        }
      }
    } catch (error) {
      console.error('Credits refresh failed:', error);
    }
  }, []);

  return { ...auth, refreshCredits, checkAuth };
}

