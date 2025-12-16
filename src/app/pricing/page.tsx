'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Crown, Zap, Loader2, Star, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES, formatPrice } from '@/lib/pricing/plans';
import { toast } from 'sonner';
import { LoginDialog } from '@/components/auth/login-dialog';

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const handlePurchase = async (type: 'subscription' | 'package', itemId: string) => {
    if (!user) {
      setAuthDialogOpen(true);
      toast.error('Войдите чтобы оформить покупку');
      return;
    }

    setLoading(itemId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Ошибка при создании платежа');
      }

      // Redirect to Prodamus
      window.location.href = data.url;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при создании платежа';
      toast.error(message);
      setLoading(null);
    }
  };

  const planIcons = {
    star: Sparkles,
    pro: Crown,
    business: Zap,
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container mx-auto px-6 py-20 lg:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-6 px-4 py-2 bg-white/5 text-white border border-white/10">
            Тарифы
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] mb-6">
            Простые и понятные тарифы
          </h1>
          <p className="text-lg md:text-xl text-[var(--text2)] max-w-2xl mx-auto mb-6">
            Платите только за то, что используете. Без скрытых платежей.
          </p>
          
          {/* Promo Banner */}
          <div className="max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-sm text-white font-medium">
                Star — 490 ₽ до 31 декабря. Далее тарифы — от 990 ₽.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan, index) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
            const isPopular = 'popular' in plan && plan.popular;
            const isLoading = loading === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    "relative p-6 rounded-2xl transition-all motion-reduce:transition-none h-full",
                    isPopular
                      ? 'bg-[var(--surface)] border-2 border-white/20 shadow-[var(--shadow-md)]'
                      : 'bg-[var(--surface)] border border-[var(--border)]'
                  )}
                >
                  {(plan.badge || plan.popular) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-full">
                      {plan.badge || 'ПОПУЛЯРНЫЙ'}
                    </div>
                  )}

                  <div className={cn("text-center mb-6", (plan.badge || plan.popular) && "pt-2")}>
                    <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-[var(--gold)]" />
                    </div>
                    <h3 className="font-bold text-[var(--text)] text-xl mb-1">{plan.name}</h3>
                    {plan.subtitle && (
                      <p className="text-xs text-[var(--muted)] mb-2">{plan.subtitle}</p>
                    )}
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-[var(--text)]">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-[var(--muted)]">₽/мес</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Star className="w-4 h-4 text-white fill-white" />
                      <span className="text-sm font-semibold text-white">{plan.credits} ⭐</span>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-[var(--text2)] mb-4 text-center leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                        <CheckCircle2 className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full",
                      isPopular
                        ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]'
                        : 'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)]'
                    )}
                    onClick={() => handlePurchase('subscription', plan.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : plan.id === 'star' ? (
                      'Оформить Star'
                    ) : plan.id === 'pro' ? (
                      'Выбрать Pro'
                    ) : (
                      'Выбрать Business'
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Credit Packages */}
        <div className="max-w-5xl mx-auto border-t border-[var(--border)] pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">
              Пакеты ⭐
            </h2>
            <p className="text-lg text-[var(--text2)]">
              Разовая покупка монет без подписки
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((pkg, index) => {
              const isLoading = loading === pkg.id;
              
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={cn(
                      "relative p-6 rounded-2xl transition-all motion-reduce:transition-none text-center",
                      pkg.popular
                        ? 'bg-[var(--surface)] border-2 border-white/20 shadow-[var(--shadow-md)]'
                        : 'bg-[var(--surface)] border border-[var(--border)]'
                    )}
                  >
                    {(pkg.badge || pkg.popular) && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-full">
                        {pkg.badge || 'ВЫГОДНО'}
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-[var(--text)] text-lg mb-2">{pkg.name}</h3>
                      <div className="text-4xl font-bold text-[var(--text)] mb-1">
                        {pkg.credits}
                      </div>
                      <div className="text-sm text-[var(--muted)] mb-3">⭐</div>
                      <div className="text-3xl font-bold text-[var(--gold)] mb-3">
                        {formatPrice(pkg.price)}
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-[var(--text2)] mb-4 leading-relaxed">
                          {pkg.description}
                        </p>
                      )}
                    </div>

                    {pkg.features && (
                      <ul className="space-y-2 mb-6 text-left">
                        {pkg.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--gold)] mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    <Button
                      className={cn(
                        "w-full",
                        pkg.popular
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] hover:border-white/20'
                      )}
                      onClick={() => handlePurchase('package', pkg.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        `Купить ${pkg.name}`
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info Text */}
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <p className="text-sm text-[var(--text2)] leading-relaxed">
              ⭐ — внутренняя валюта LensRoom. Монеты списываются только за запуск генерации.
              <br />
              Стоимость зависит от модели и режима (фото/видео/длина/качество).
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-24 border-t border-[var(--border)] pt-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] text-center mb-12">
            Частые вопросы
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Что такое кредиты?',
                a: 'Кредиты — это единая валюта для всех моделей. Разные модели стоят разное количество кредитов в зависимости от сложности.',
              },
              {
                q: 'Какие способы оплаты?',
                a: 'Принимаем карты Visa, Mastercard, МИР, а также СБП и электронные кошельки.',
              },
              {
                q: 'Как работает подписка?',
                a: 'Подписка автоматически продлевается каждый месяц. Кредиты начисляются в день продления. Отменить можно в любой момент.',
              },
              {
                q: 'Есть ли возврат средств?',
                a: 'Мы возвращаем деньги в течение 14 дней, если вы не использовали кредиты.',
              },
              {
                q: 'Сколько времени действуют кредиты?',
                a: 'Купленные кредиты не сгорают и действуют бессрочно. Кредиты по подписке действуют до конца периода.',
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-white/20 transition-colors motion-reduce:transition-none"
              >
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{faq.q}</h3>
                <p className="text-[var(--text2)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Auth Dialog */}
      <LoginDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
    </div>
  );
}