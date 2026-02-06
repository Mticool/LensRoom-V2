'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Стейт не блокирует первый рендер: проверка сессии в фоне
  const [loading, setLoading] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check both Supabase auth and Telegram session
    const checkAuth = async () => {
      try {
        // First, check Supabase session (5s timeout — при блокировке VPN/регион не зависаем)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        );
        let session: Session | null = null;
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          session = result?.data?.session ?? null;
        } catch {
          // Supabase недоступен (VPN, блокировка) — показываем страницу без сессии
        }

        if (session?.user) {
          setUser(session.user);
          setLoading(false);
          return;
        }

        // If no Supabase session, check Telegram session cookie
        const telegramCookie = Cookies.get('lr_session');
        
        if (telegramCookie) {
          // Fetch user info from API (which validates Telegram session)
          try {
            const response = await fetch('/api/auth/session', {
              credentials: 'include',
              signal: AbortSignal.timeout(5000), // 5s — не блокируем первую отрисовку
            });
            
            if (response.ok) {
              const userData = await response.json();
              
              // Create a mock User object for Telegram users
              if (userData.user) {
                setUser({
                  id: userData.user.id,
                  email: userData.user.email || `telegram_${userData.user.telegramId}@lensroom.local`,
                  created_at: userData.user.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  aud: 'authenticated',
                  role: 'authenticated',
                  app_metadata: {},
                  user_metadata: {
                    telegram_id: userData.user.telegramId,
                    username: userData.user.username,
                    first_name: userData.user.firstName,
                  },
                } as User);
              }
            }
          } catch (error) {
            console.error('[Auth] Failed to check Telegram session:', error);
          }
        }
      } catch (error) {
        console.error('[Auth] checkAuth error:', error);
      } finally {
        // Always set loading to false, even if errors occurred
        setLoading(false);
      }
    };

    checkAuth();
    
    // Safety timeout: если Supabase/сеть зависли — через 5s показываем страницу
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, [supabase]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
  }), [user, loading, signUp, signIn, signOut, signInWithGoogle]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};