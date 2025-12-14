'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TelegramSession } from '@/types/telegram';

interface TelegramUser {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
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
    refreshSession();
  }, [refreshSession]);

  // Sign in with Telegram Login Widget payload
  const signInWithTelegram = async (payload: any) => {
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      
      // Refresh session to get full user data
      await refreshSession();

      return {
        success: true,
        canNotify: data.canNotify || false,
      };
    } catch (error) {
      console.error('[TelegramAuth] Sign in error:', error);
      throw error;
    }
  };

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
