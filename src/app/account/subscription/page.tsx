'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
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
  const { user } = useAuth();
  const { balance } = useCreditsStore();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchSubscription();
  }, [user, router]);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setSubscription(data);
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
    return planId === 'pro' ? 'Pro' : 'Business';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] pt-20">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>На главную</span>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
            Управление подпиской
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {user?.email}
          </p>
        </motion.div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="hover" className="mb-6">
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">Текущий баланс</p>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                  {balance} ⭐
                </h2>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
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
            <Card variant="default" className="mb-6">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
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
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Следующее списание</p>
                        <p className="text-[var(--color-text-primary)] font-semibold">
                          {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Кредитов в месяц</p>
                        <p className="text-[var(--color-text-primary)] font-semibold">
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
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          Доступ сохранится до {formatDate(subscription.current_period_end)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Button */}
                {!subscription.cancel_at_period_end && (
                  <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                    <Button
                      variant="secondary"
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
            <Card variant="default">
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  У вас нет активной подписки
                </h3>
                <p className="text-[var(--color-text-secondary)] mb-6">
                  Оформите подписку и получайте кредиты каждый месяц
                </p>
                <Button asChild variant="default" size="lg">
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
