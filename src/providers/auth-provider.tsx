'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check both Supabase auth and Telegram session
    const checkAuth = async () => {
      // First, check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
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
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            
            // Create a mock User object for Telegram users
            if (userData.user) {
              setUser({
                id: userData.user.id,
                email: userData.user.email || `telegram_${userData.telegramId}@lensroom.local`,
                created_at: userData.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                aud: 'authenticated',
                role: 'authenticated',
                app_metadata: {},
                user_metadata: {
                  telegram_id: userData.telegramId,
                  username: userData.username,
                  first_name: userData.firstName,
                },
              } as User);
            }
          }
        } catch (error) {
          console.error('[Auth] Failed to check Telegram session:', error);
        }
      }
      
      setLoading(false);
    };

    checkAuth();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};