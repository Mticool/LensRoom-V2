'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, MessageCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoginState = 'idle' | 'loading' | 'waiting' | 'success' | 'error';

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { refreshSession } = useTelegramAuth();
  const { signInWithGoogle } = useAuth();

  // Clean up polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLoginState('idle');
      setLoginCode(null);
      setBotLink(null);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen]);

  const handleTelegramLogin = async () => {
    try {
      setLoginState('loading');
      
      // 1. Get login code from server
      const initResponse = await fetch('/api/auth/telegram/init', {
        method: 'POST',
      });
      
      if (!initResponse.ok) {
        throw new Error('Failed to initialize login');
      }
      
      const { code, botLink: link } = await initResponse.json();
      setLoginCode(code);
      setBotLink(link);
      setLoginState('waiting');
      
      // 2. Open Telegram
      window.open(link, '_blank');
      
      // 3. Start polling for status
      pollingRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/auth/telegram/status?code=${code}`);
          const data = await statusResponse.json();
          
          if (data.status === 'authenticated') {
            // Success!
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setLoginState('success');
            await refreshSession();
            toast.success('Вы успешно вошли!');
            setTimeout(() => {
              onClose();
            }, 1000);
          } else if (data.status === 'expired') {
            // Code expired
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setLoginState('error');
            toast.error('Время ожидания истекло. Попробуйте снова.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      // Auto-cancel after 5 minutes
      setTimeout(() => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (loginState === 'waiting') {
            setLoginState('error');
            toast.error('Время ожидания истекло');
          }
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Telegram login error:', error);
      setLoginState('error');
      toast.error('Не удалось начать вход');
    }
  };

  const handleRetry = () => {
    setLoginState('idle');
    setLoginCode(null);
    setBotLink(null);
  };

  const handleOpenTelegram = () => {
    if (botLink) {
      window.open(botLink, '_blank');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка';
      toast.error(message);
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

            {loginState === 'waiting' ? (
              /* Waiting for Telegram confirmation */
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-[#0088cc]/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-[#0088cc]" />
                </div>
                
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                  Откройте Telegram
                </h2>
                <p className="text-[var(--text2)] mb-6">
                  Нажмите <b>Start</b> в боте LensRoom, чтобы завершить вход.
                </p>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--gold)]" />
                  <span className="text-sm text-[var(--text2)]">Ожидание подтверждения...</span>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleOpenTelegram}
                    className="w-full bg-[#0088cc] text-white hover:bg-[#0077b5]"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Открыть Telegram
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                    className="w-full"
                  >
                    Начать заново
                  </Button>
                </div>
              </div>
            ) : loginState === 'success' ? (
              /* Success */
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                  Успешно!
                </h2>
                <p className="text-[var(--text2)]">
                  Вы вошли в аккаунт
                </p>
              </div>
            ) : loginState === 'error' ? (
              /* Error */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                  Не удалось войти
                </h2>
                <p className="text-[var(--text2)] mb-6">
                  Попробуйте ещё раз
                </p>

                <Button
                  onClick={handleRetry}
                  className="w-full bg-[var(--gold)] text-black hover:bg-[var(--goldHover)]"
                >
                  Попробовать снова
                </Button>
              </div>
            ) : (
              /* Main Login View */
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
                    Вход в LensRoom
                  </h2>
                  <p className="text-[var(--text2)]">Войдите через Telegram или Google</p>
                </div>

                {/* Login buttons */}
                <div className="space-y-4">
                  {/* Telegram - Primary */}
                  <Button
                    onClick={handleTelegramLogin}
                    disabled={loginState === 'loading'}
                    className="w-full bg-[#0088cc] text-white hover:bg-[#0077b5] h-12 text-base"
                  >
                    {loginState === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <MessageCircle className="w-5 h-5 mr-2" />
                    )}
                    Войти через Telegram
                  </Button>

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

                  {/* Google */}
                  <Button
                    variant="secondary"
                    className="w-full"
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

                  {/* Benefits */}
                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--muted)] text-center mb-3">
                      Что вы получите:
                    </p>
                    <ul className="space-y-2 text-sm text-[var(--text2)]">
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        100 бесплатных кредитов
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        Сохранение истории генераций
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        Уведомления о новых функциях
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-[var(--muted)] text-center mt-6">
                  Нажимая «Войти», вы соглашаетесь с условиями использования
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
