'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TelegramSession } from '@/types/telegram';

function decodeBase64Url(input: string): string {
  // base64url -> base64
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function tryExtractTelegramAuthFromHash(): any | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.includes('tgAuthResult=')) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const tgAuthResult = params.get('tgAuthResult');
  if (!tgAuthResult) return null;

  try {
    const decoded = decodeBase64Url(decodeURIComponent(tgAuthResult));
    const obj = JSON.parse(decoded);
    if (obj?.id) obj.id = Number(obj.id);
    if (obj?.auth_date) obj.auth_date = Number(obj.auth_date);
    return obj;
  } catch (e) {
    console.error('[TelegramAuth] Failed to parse tgAuthResult:', e);
    return null;
  }
}

type UserRole = 'user' | 'manager' | 'admin';

interface TelegramUser {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  role: UserRole;
  canNotify: boolean;
}

interface TelegramAuthContextType {
  user: TelegramUser | null;
  loading: boolean;
  signInWithTelegram: (payload: any) => Promise<{ success: boolean; canNotify: boolean }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

export function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign in with Telegram Login Widget payload
  const signInWithTelegram = useCallback(async (payload: any) => {
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    return {
      success: true,
      canNotify: data.canNotify || false,
    };
  }, []);

  // Fetch current session on mount
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setUser(data.user || null);
    } catch (error) {
      console.error('[TelegramAuth] Session fetch error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Support Telegram redirect login flow (often on mobile):
    // Telegram can redirect back with #tgAuthResult=<base64url-json>
    const redirectPayload = tryExtractTelegramAuthFromHash();
    if (redirectPayload) {
      // Clear hash early to avoid repeated attempts
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      (async () => {
        try {
          await signInWithTelegram(redirectPayload);
        } catch (e) {
          console.error('[TelegramAuth] Redirect sign-in failed:', e);
        } finally {
          await refreshSession();
        }
      })();
      return;
    }

    refreshSession();
  }, [refreshSession, signInWithTelegram]);

  // Sign out
  const signOut = async () => {
    try {
      await fetch('/api/auth/telegram', { method: 'DELETE' });
      setUser(null);
    } catch (error) {
      console.error('[TelegramAuth] Sign out error:', error);
    }
  };

  return (
    <TelegramAuthContext.Provider
      value={{
        user,
        loading,
        signInWithTelegram,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </TelegramAuthContext.Provider>
  );
}

export function useTelegramAuth() {
  const context = useContext(TelegramAuthContext);
  if (!context) {
    throw new Error('useTelegramAuth must be used within TelegramAuthProvider');
  }
  return context;
}


