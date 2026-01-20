'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { TelegramLoginButton } from '@/components/auth/telegram-login-button';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type BotLoginState = 'idle' | 'loading' | 'waiting' | 'success' | 'error';

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const { refreshSession } = useTelegramAuth();
  const { signInWithGoogle } = useAuth();
  const [botLoginState, setBotLoginState] = useState<BotLoginState>('idle');
  const [botLink, setBotLink] = useState<string | null>(null);
  const [botCode, setBotCode] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLocalhost = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
  }, []);

  useEffect(() => {
    // Cleanup polling on close/unmount
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      setBotLoginState('idle');
      setBotLink(null);
      setBotCode(null);
    }
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка';
      toast.error(message);
    }
  };

  const handleBotLogin = async () => {
    try {
      setBotLoginState('loading');

      const initResponse = await fetch('/api/auth/telegram/init', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
      });
      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize login');
      }

      const { code, botLink: link } = await initResponse.json();
      if (!code || !link) throw new Error('Invalid response from server');

      setBotCode(code);
      setBotLink(link);
      setBotLoginState('waiting');

      try {
        window.open(link, '_blank');
      } catch {
        // ignore; user can click again below
      }

      if (pollingRef.current) clearInterval(pollingRef.current);

      let pollAttempts = 0;
      const maxPollAttempts = 150; // 5 minutes (150 * 2s)
      pollingRef.current = setInterval(async () => {
        pollAttempts++;
        if (pollAttempts > maxPollAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setBotLoginState('error');
          toast.error('Время ожидания истекло');
          return;
        }

        try {
          const statusResponse = await fetch(`/api/auth/telegram/status?code=${encodeURIComponent(code)}`, {
            credentials: 'include',
            signal: AbortSignal.timeout(8000),
          });
          if (!statusResponse.ok) return;
          const data = await statusResponse.json();

          if (data.status === 'authenticated') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setBotLoginState('success');
            toast.success('Вы успешно вошли!');

            setTimeout(async () => {
              try {
                await refreshSession();
              } catch {
                // ignore
              } finally {
                onClose();
                window.location.reload();
              }
            }, 300);
          } else if (data.status === 'expired') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setBotLoginState('error');
            toast.error('Код авторизации истёк. Попробуйте снова.');
          }
        } catch {
          // Keep polling on transient errors
        }
      }, 2000);
    } catch (e) {
      setBotLoginState('error');
      const msg = e instanceof Error ? e.message : 'Не удалось начать вход';
      toast.error(msg);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-full max-w-md p-6 bg-[var(--surface)] rounded-2xl
                       border border-[var(--border)] shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--surface2)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--muted)]" />
            </button>

            {/* Main Login View (Telegram Login Widget) */}
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
                  Вход в LensRoom
                </h2>
                <p className="text-[var(--text2)]">Войдите через Telegram или Google</p>
              </div>

              <div className="space-y-4">
                {!isLocalhost ? (
                  <div className="flex justify-center">
                    <TelegramLoginButton
                      buttonSize="large"
                      cornerRadius={12}
                      requestAccess="write"
                      onSuccess={async () => {
                        try {
                          await refreshSession();
                        } catch {
                          // ignore
                        }
                        onClose();
                        // ensure header/store sees cookie
                        setTimeout(() => window.location.reload(), 150);
                      }}
                      onError={(e) => {
                        toast.error(e.message || 'Ошибка авторизации');
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">
                    Telegram‑виджет не работает на <b>localhost</b> (ошибка <code>Bot domain invalid</code>).
                    Используйте вход через бота ниже.
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[var(--surface)] px-2 text-[var(--muted)]">
                      или
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={handleBotLogin}
                  disabled={botLoginState === 'loading' || botLoginState === 'waiting'}
                >
                  {botLoginState === 'waiting' ? 'Ожидаем подтверждения в Telegram…' : 'Войти через бота (если виджет не работает)'}
                </Button>

                {botLoginState === 'waiting' && botLink && (
                  <div className="text-xs text-[var(--muted)] px-1">
                    Если Telegram не открылся автоматически —{' '}
                    <button
                      type="button"
                      onClick={() => window.open(botLink, '_blank')}
                      className="text-[var(--accent-primary)] hover:underline"
                    >
                      открыть бота
                    </button>
                    {botCode ? <span className="block mt-1 opacity-70">Код: {botCode.slice(0, 8)}…</span> : null}
                  </div>
                )}

                <Button
                  variant="secondary"
                  className="w-full h-12 text-base"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Войти через Google
                </Button>

                <div className="pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] text-center mb-3">
                    Что вы получите:
                  </p>
                  <ul className="space-y-2 text-sm text-[var(--text2)]">
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--gold)]">✓</span>
                      50⭐ бонус при регистрации
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--gold)]">✓</span>
                      Сохранение истории генераций
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--gold)]">✓</span>
                      Доступ к библиотеке
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-[10px] text-[var(--muted)] text-center mt-6">
                Нажимая «Войти», вы соглашаетесь с условиями использования
              </p>
            </>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
