'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { toast } from 'sonner';

interface TelegramLoginButtonProps {
  botName?: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: 'write';
  onSuccess?: (canNotify: boolean) => void;
  onError?: (error: Error) => void;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: any) => void;
    };
  }
}

export function TelegramLoginButton({
  botName,
  buttonSize = 'large',
  cornerRadius = 12,
  requestAccess = 'write',
  onSuccess,
  onError,
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { signInWithTelegram } = useTelegramAuth();

  const handleAuth = useCallback(async (telegramUser: any) => {
    try {
      const result = await signInWithTelegram(telegramUser);
      toast.success('Вы успешно вошли!');
      onSuccess?.(result.canNotify);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка авторизации';
      toast.error(message);
      onError?.(error instanceof Error ? error : new Error(message));
    }
  }, [signInWithTelegram, onSuccess, onError]);

  useEffect(() => {
    // Create callback for Telegram widget
    const callbackName = 'TelegramLoginCallback';
    (window as any)[callbackName] = handleAuth;

    // Load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botName || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoomBot');
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-userpic', 'true');

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any)[callbackName];
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, handleAuth]);

  return <div ref={containerRef} className="telegram-login-button" />;
}

/**
 * Custom styled Telegram login button (fallback if widget doesn't load)
 */
export function TelegramLoginButtonCustom({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium transition-colors disabled:opacity-50"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.121.13.154.305.17.432.015.126.034.412.019.635z"/>
      </svg>
      {loading ? 'Загрузка...' : 'Войти через Telegram'}
    </button>
  );
}


