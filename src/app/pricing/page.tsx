'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES, formatPrice } from '@/lib/pricing/plans';
import { toast } from 'sonner';
import { LoginDialog } from '@/components/auth/login-dialog';

export default function PricingPage() {
  const { user } = useAuth();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleBuyCredits = async (credits: number, price: number) => {
    if (!user) {
      setLoginOpen(true);
      toast.error('Войдите чтобы купить кредиты');
      return;
    }

    setLoadingPackage(`pack-${credits}`);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания платежа');
      }

      // Redirect to payment page
      window.location.href = data.paymentUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка';
      toast.error(message);
    } finally {
      setLoadingPackage(null);
    }
  };

  const planIcons = {
    starter: Sparkles,
    pro: Crown,
    business: Zap,
  };

  const planGradients = {
    starter: 'from-green-500 to-emerald-500',
    pro: 'from-purple-500 to-blue-500',
    business: 'from-orange-500 to-red-500',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge variant="purple" className="mb-6 px-4 py-2">
            Тарифы
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-6">
            Простые и{' '}
            <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              понятные тарифы
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Платите только за то, что используете. Без скрытых платежей.
          </p>
        </motion.div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-24 max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan, index) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
            const gradient = planGradients[plan.id as keyof typeof planGradients] || 'from-gray-500 to-gray-600';
            const isPopular = 'popular' in plan && plan.popular;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  variant="glow" 
                  padding="none"
                  className={cn(
                    "relative h-full",
                    isPopular && "border-2 border-purple-500 shadow-xl shadow-purple-500/20"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm shadow-lg">
                        ПОПУЛЯРНЫЙ
                      </div>
                    </div>
                  )}

                  <div className={cn("p-8", isPopular && "pt-10")}>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{plan.name}</h3>
                    
                    <div className="mb-6">
                      {plan.price === 0 ? (
                        <span className="text-4xl font-bold text-[var(--color-text-primary)]">FREE</span>
                      ) : (
                        <>
                          <span className={cn(
                            "text-4xl font-bold",
                            isPopular 
                              ? "bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent"
                              : "text-[var(--color-text-primary)]"
                          )}>
                            {formatPrice(plan.price)}
                          </span>
                          <span className="text-[var(--color-text-secondary)] ml-2">/мес</span>
                        </>
                      )}
                    </div>

                    <p className="text-[var(--color-text-secondary)] mb-6">
                      {plan.credits} кредитов {plan.recurring ? 'каждый месяц' : 'на старт'}
                    </p>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            isPopular ? "bg-purple-500/20" : "bg-[var(--color-bg-tertiary)]"
                          )}>
                            <Check className={cn(
                              "w-4 h-4",
                              isPopular ? "text-purple-500" : "text-[var(--color-text-secondary)]"
                            )} />
                          </div>
                          <span className="text-[var(--color-text-primary)]">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.price === 0 ? (
                      <Button asChild variant="secondary" size="lg" className="w-full">
                        <Link href="/create">Начать бесплатно</Link>
                      </Button>
                    ) : (
                      <Button 
                        variant={isPopular ? "primary" : "secondary"} 
                        size="lg" 
                        className={cn("w-full", isPopular && "shadow-lg shadow-purple-500/20")}
                        onClick={() => toast.info('Подписки скоро будут доступны! Пока можете купить пакет кредитов.')}
                      >
                        Скоро
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Credit Packages */}
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Пакеты{' '}
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                кредитов
              </span>
            </h2>
            <p className="text-lg text-[var(--color-text-secondary)]">
              Покупайте кредиты пакетами и экономьте до 44%
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant={pkg.popular ? "glow" : "default"}
                  padding="none"
                  hover
                  className={cn(
                    "relative",
                    pkg.popular && "border-2 border-purple-500 shadow-lg shadow-purple-500/20"
                  )}
                >
                  <div className="p-6 text-center">
                    {pkg.popular && (
                      <div className="mb-3">
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold">
                          ВЫГОДНО
                        </span>
                      </div>
                    )}
                    
                    {'discount' in pkg && pkg.discount && (
                      <div className="mb-2">
                        <span className="text-xs text-green-400 font-medium">
                          -{pkg.discount}% выгоднее
                        </span>
                      </div>
                    )}
                    
                    <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
                      {pkg.credits}
                    </div>
                    <div className="text-sm text-[var(--color-text-tertiary)] mb-4">кредитов</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                      {formatPrice(pkg.price)}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mb-6">
                      {(pkg.price / pkg.credits).toFixed(2)} ₽ за кредит
                    </div>
                    
                    <Button 
                      variant={pkg.popular ? "primary" : "secondary"} 
                      className={cn("w-full", pkg.popular && "shadow-lg shadow-purple-500/20")}
                      onClick={() => handleBuyCredits(pkg.credits, pkg.price)}
                      disabled={loadingPackage === pkg.id}
                    >
                      {loadingPackage === pkg.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Купить'
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] text-center mb-12">
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
                q: 'Есть ли возврат средств?',
                a: 'Мы возвращаем деньги в течение 14 дней, если вы не использовали кредиты.',
              },
              {
                q: 'Сколько времени действуют кредиты?',
                a: 'Купленные кредиты не сгорают и действуют бессрочно.',
              },
            ].map((faq, i) => (
              <Card key={i} variant="glow" padding="none">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{faq.q}</h3>
                  <p className="text-[var(--color-text-secondary)]">{faq.a}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
