'use client';

import { useEffect, useState } from 'react';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  credits_per_month: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useTelegramAuth();
  const { balance } = useCreditsStore();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (user) {
      fetchSubscription();
    }
  }, [user, authLoading, router]);

  const fetchSubscription = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/current', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Вы уверены что хотите отменить подписку?\n\nДоступ сохранится до конца оплаченного периода.')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при отмене');
      }

      toast.success('Подписка будет отменена в конце периода');
      await fetchSubscription();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при отмене подписки';
      toast.error(message);
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getPlanName = (planId: string) => {
    const names: Record<string, string> = {
      creator: 'Creator',
      creator_plus: 'Creator+',
      business: 'Business',
      pro: 'Creator+', // Legacy
      star: 'Creator', // Legacy
    };
    return names[planId] || planId;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.firstName || user.username || 'Пользователь';

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Back Button */}
        <Link 
          href="/profile"
          className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>В профиль</span>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            Управление подпиской
          </h1>
          <p className="text-[var(--muted)]">
            {displayName} {user.username && `(@${user.username})`}
          </p>
        </motion.div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">Текущий баланс</p>
                <h2 className="text-3xl font-bold text-[var(--gold)]">
                  {balance} ⭐
                </h2>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-amber-600 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-black" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Subscription Status */}
        {subscription ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-6 bg-[var(--surface)] border-[var(--border)]">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)] to-amber-600 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text)]">
                        {getPlanName(subscription.plan_id)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {subscription.cancel_at_period_end ? (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Будет отменена
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Активна
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface2)]">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[var(--muted)]" />
                      <div>
                        <p className="text-sm text-[var(--muted)]">Следующее списание</p>
                        <p className="text-[var(--text)] font-semibold">
                          {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface2)]">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[var(--muted)]" />
                      <div>
                        <p className="text-sm text-[var(--muted)]">Кредитов в месяц</p>
                        <p className="text-[var(--text)] font-semibold">
                          {subscription.credits_per_month} ⭐
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {subscription.cancel_at_period_end && (
                  <div className="mt-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-500 mb-1">
                          Подписка будет отменена
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          Доступ сохранится до {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                {!subscription.cancel_at_period_end && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      className="w-full text-red-500 hover:bg-red-500/10 border-red-500/30"
                      onClick={handleCancelSubscription}
                      disabled={canceling}
                    >
                      {canceling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Отмена...
                        </>
                      ) : (
                        'Отменить подписку'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[var(--surface)] border-[var(--border)]">
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--surface2)] flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-[var(--muted)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)] mb-2">
                  У вас нет активной подписки
                </h3>
                <p className="text-[var(--muted)] mb-6">
                  Оформите подписку и получайте кредиты каждый месяц
                </p>
                <Button asChild className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
                  <Link href="/pricing">
                    Выбрать план
                  </Link>
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}