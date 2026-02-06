'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { captureReferralCodeFromUrl, getStoredReferralCode, clearStoredReferralCode } from '@/lib/referrals/client';
import { detectWebView, expandWebView, getTelegramWebApp } from "@/lib/telegram/webview";

function decodeBase64Url(input: string): string {
  // base64url -> base64
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function tryExtractTelegramAuthFromHash(): Record<string, unknown> | null {
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
  // Стейт не блокирует первый рендер: проверка сессии в фоне
  const [loading, setLoading] = useState(false);

  // Sign in with Telegram Login Widget payload
  const signInWithTelegram = useCallback(async (payload: any) => {
    // Capture ?ref=... as early as possible (mobile Safari often keeps query across redirects)
    try { captureReferralCodeFromUrl(); } catch {}
    const referralCode = getStoredReferralCode();
    const response = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        referralCode: referralCode || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    // Clear stored referral once we've successfully signed in (claim is idempotent server-side)
    try { clearStoredReferralCode(); } catch {}
    return {
      success: true,
      canNotify: data.canNotify || false,
    };
  }, []);

  // Fetch current session on mount
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        signal: AbortSignal.timeout(5000), // 5s — при VPN/блокировке не зависаем
      });
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
    // Telegram WebView: expand to full height + disable rubber scroll via CSS class.
    try {
      if (detectWebView()) {
        document.documentElement.classList.add("tg-webview");
        const webApp = getTelegramWebApp();
        if (webApp && typeof webApp.ready === "function") {
          try {
            webApp.ready();
          } catch {
            // ignore
          }
        }
        expandWebView();
      } else {
        document.documentElement.classList.remove("tg-webview");
      }
    } catch {
      // ignore
    }

    // Save referral code from URL if present (even before login)
    try { captureReferralCodeFromUrl(); } catch {}

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
    
    // Safety timeout: через 5s показываем страницу даже если /api/auth/session не ответил
    const timeoutId = setTimeout(() => setLoading(false), 5000);
    
    return () => clearTimeout(timeoutId);
  }, [refreshSession, signInWithTelegram]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/telegram', { method: 'DELETE' });
      setUser(null);
    } catch (error) {
      console.error('[TelegramAuth] Sign out error:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    signInWithTelegram,
    signOut,
    refreshSession,
  }), [user, loading, signInWithTelegram, signOut, refreshSession]);

  return (
    <TelegramAuthContext.Provider value={contextValue}>
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




