'use client';

import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface Props {
  className?: string;
  compact?: boolean;
}

export function PushNotificationToggle({ className = '', compact = false }: Props) {
  const { status, isSubscribed, subscribe, unsubscribe, canSubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  if (status === 'unsupported') {
    if (compact) return null;
    return (
      <div className={`text-xs text-[var(--muted)] ${className}`}>
        Уведомления не поддерживаются
      </div>
    );
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          toast.success('Уведомления отключены');
        } else {
          toast.error('Не удалось отключить уведомления');
        }
      } else {
        const success = await subscribe();
        if (success) {
          toast.success('Уведомления включены! 🔔');
        } else if (status === 'denied') {
          toast.error('Уведомления заблокированы в браузере');
        } else {
          toast.error('Не удалось включить уведомления');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading || status === 'denied'}
        className={`
          p-2 rounded-lg transition-all
          ${isSubscribed 
            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' 
            : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={isSubscribed ? 'Отключить уведомления' : 'Включить уведомления'}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`
          p-2 rounded-lg
          ${isSubscribed 
            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' 
            : 'bg-[var(--surface)] text-[var(--muted)]'
          }
        `}>
          {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <div>
          <div className="font-medium text-[var(--text)]">Push-уведомления</div>
          <div className="text-xs text-[var(--muted)]">
            {status === 'denied' 
              ? 'Заблокированы в браузере'
              : isSubscribed 
                ? 'Узнавайте когда генерация готова'
                : 'Включите чтобы не пропустить результат'
            }
          </div>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading || status === 'denied'}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${isSubscribed 
            ? 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]' 
            : 'bg-[var(--accent-primary)] text-white hover:opacity-90'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          'Отключить'
        ) : (
          'Включить'
        )}
      </button>
    </div>
  );
}







