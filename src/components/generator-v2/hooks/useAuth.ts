'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import logger from '@/lib/logger';
import { useCreditsStore } from '@/stores/credits-store';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';

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
      // Use /api/auth/session which returns both user info AND balance in one call
      const response = await apiFetch('/api/auth/session', {
        dedupe: true,
        retry: {
          maxRetries: 2,
          initialDelay: 500,
        },
      });

      console.log('[useAuth] /api/auth/session response:', response.status, response.ok);

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
      console.log('[useAuth] Auth data:', { hasUser: !!data.user, balance: data.balance });

      // /api/auth/session returns { user: {...}, balance, subscriptionStars, packageStars }
      if (data.user) {
        const credits = data.balance || 0;
        const subscriptionStars = typeof data.subscriptionStars === 'number' ? data.subscriptionStars : undefined;
        const packageStars = typeof data.packageStars === 'number' ? data.packageStars : undefined;

        console.log('[useAuth] Setting isAuthenticated=true, credits=', credits);
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          credits,
          userId: data.user.id || data.user.telegramId,
          username: data.user.username || data.user.firstName || null,
          role: data.user.role || 'user',
        });

        // Sync to global header/store
        try {
          useCreditsStore.getState().setBalance(Number(credits) || 0, subscriptionStars, packageStars);
        } catch {
          // ignore cross-store sync errors
        }
      } else {
        console.log('[useAuth] No user in response - setting isAuthenticated=false');
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
      const response = await fetchWithTimeout('/api/credits/balance', { timeout: 10_000, credentials: 'include' });
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
      if (error instanceof FetchTimeoutError) return;
      console.error('Credits refresh failed:', error);
    }
  }, []);

  return useMemo(
    () => ({ ...auth, refreshCredits, checkAuth }),
    [auth, refreshCredits, checkAuth]
  );
}
