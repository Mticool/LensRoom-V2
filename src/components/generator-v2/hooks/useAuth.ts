'use client';

import { useEffect, useState, useCallback } from 'react';

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
      // First check session status via /api/auth/me
      const response = await fetch('/api/auth/me');
      
      if (!response.ok) {
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
      
      // API returns { user: { id }, telegramId, username, firstName, role, ... }
      if (data.user || data.telegramId) {
        // Fetch credits separately
        let credits = 0;
        try {
          const creditsRes = await fetch('/api/credits/balance');
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            credits = creditsData.balance || creditsData.credits || 0;
          }
        } catch {
          // ignore credits fetch error
        }

        setAuth({
          isAuthenticated: true,
          isLoading: false,
          credits,
          userId: data.user?.id || data.telegramId,
          username: data.username || data.firstName || null,
          role: data.role || 'user',
        });
      } else {
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
      console.error('Auth check failed:', error);
      setAuth(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refreshCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setAuth(prev => ({
          ...prev,
          credits: data.balance || data.credits || 0,
        }));
      }
    } catch (error) {
      console.error('Credits refresh failed:', error);
    }
  }, []);

  return { ...auth, refreshCredits, checkAuth };
}

