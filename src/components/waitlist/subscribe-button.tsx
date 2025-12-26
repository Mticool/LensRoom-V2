'use client';

import { useState } from 'react';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Loader2, 
  CheckCircle2, 
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { WaitlistType } from '@/types/telegram';

interface WaitlistSubscribeButtonProps {
  type: WaitlistType;
  source?: string;
  onSuccess?: () => void;
  className?: string;
}

export function WaitlistSubscribeButton({
  type,
  source,
  onSuccess,
  className,
}: WaitlistSubscribeButtonProps) {
  const { user } = useTelegramAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showBotPrompt, setShowBotPrompt] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Войдите в аккаунт, чтобы подписаться');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, source }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribed(true);
        
        if (!data.canNotify) {
          setShowBotPrompt(true);
        } else {
          toast.success('Подписка оформлена! Мы напишем вам в Telegram.');
          onSuccess?.();
        }
      } else {
        toast.error(data.error || 'Ошибка подписки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBot = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoom_bot';
    window.open(`https://t.me/${botUsername}?start=notify`, '_blank');
    toast.info('После запуска бота вы будете получать уведомления');
    onSuccess?.();
  };

  if (showBotPrompt) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Подписка оформлена!
        </div>
        <p className="text-sm text-[var(--muted)]">
          Чтобы получить уведомление в Telegram, подключите нашего бота:
        </p>
        <Button
          onClick={handleConnectBot}
          className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Подключить бота
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle2 className="w-5 h-5" />
        <span>Вы подписаны!</span>
      </div>
    );
  }

  return (
    <Button
      onClick={handleSubscribe}
      disabled={loading}
      className={className || "bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      {user ? 'Уведомить меня' : 'Войдите, чтобы подписаться'}
    </Button>
  );
}

/**
 * Inline subscribe link (smaller, for lists)
 */
export function WaitlistSubscribeLink({
  type,
  source,
}: {
  type: WaitlistType;
  source?: string;
}) {
  const { user } = useTelegramAuth();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Войдите в аккаунт');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, source }),
      });

      if (response.ok) {
        setSubscribed(true);
        toast.success('Подписка оформлена!');
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <span className="text-green-400 text-xs flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Подписаны
      </span>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className="text-[var(--gold)] text-xs hover:underline disabled:opacity-50 flex items-center gap-1"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Bell className="w-3 h-3" />
      )}
      Уведомить
    </button>
  );
}




