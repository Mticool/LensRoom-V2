'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    price: 'FREE',
    description: 'Для старта и экспериментов',
    icon: Sparkles,
    gradient: 'from-green-500 to-emerald-500',
    features: [
      '100 кредитов на старт',
      'Доступ ко всем моделям',
      'История 7 дней',
      'Базовое качество',
      'Watermark на результатах',
    ],
    cta: 'Начать бесплатно',
    href: '/create',
    highlighted: false,
  },
  {
    name: 'Creator',
    price: '1 990₽',
    period: '/мес',
    description: 'Для создателей контента',
    icon: Crown,
    gradient: 'from-purple-500 to-blue-500',
    features: [
      '1 000 кредитов каждый месяц',
      'Без watermark',
      'История 30 дней',
      'Максимальное качество',
      'Priority генерация',
      'Premium промпты',
    ],
    cta: 'Выбрать Creator',
    href: '/create',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '4 990₽',
    period: '/мес',
    description: 'Для команд и бизнеса',
    icon: Zap,
    gradient: 'from-orange-500 to-red-500',
    features: [
      'Unlimited кредиты',
      'API доступ',
      'Batch processing',
      'Custom модели',
      'Priority support 24/7',
      'Team workspace',
    ],
    cta: 'Связаться с нами',
    href: '/pricing',
    highlighted: false,
  },
];

const creditPackages = [
  { credits: 200, price: 499, popular: false },
  { credits: 500, price: 999, popular: false },
  { credits: 1200, price: 1990, popular: true },
  { credits: 3000, price: 3990, popular: false },
];

export default function PricingPage() {
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

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-24 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {plan.highlighted ? (
                  // Creator - Highlighted plan
                  <Card 
                    variant="glow" 
                    padding="none"
                    className="relative border-2 border-purple-500 shadow-xl shadow-purple-500/20 h-full"
                  >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm shadow-lg">
                        ПОПУЛЯРНЫЙ
                      </div>
                    </div>

                    <div className="p-8 pt-10">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">{plan.name}</h3>
                      <p className="text-[var(--color-text-secondary)] mb-6">{plan.description}</p>

                      <div className="mb-8">
                        <span className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-[var(--color-text-secondary)] ml-2">{plan.period}</span>
                        )}
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="text-[var(--color-text-primary)]">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button asChild variant="primary" size="lg" className="w-full shadow-lg shadow-purple-500/20">
                        <Link href={plan.href}>{plan.cta}</Link>
                      </Button>
                    </div>
                  </Card>
                ) : (
                  // Regular plans
                  <Card variant="glow" padding="none" className="h-full">
                    <div className="p-8">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{plan.name}</h3>
                      <p className="text-[var(--color-text-secondary)] mb-6">{plan.description}</p>

                      <div className="mb-8">
                        <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-[var(--color-text-secondary)] ml-2">{plan.period}</span>
                        )}
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </div>
                            <span className="text-[var(--color-text-primary)]">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button asChild variant="secondary" size="lg" className="w-full">
                        <Link href={plan.href}>{plan.cta}</Link>
                      </Button>
                    </div>
                  </Card>
                )}
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
              Покупайте кредиты пакетами и экономьте
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {creditPackages.map((pkg, index) => (
              <motion.div
                key={pkg.credits}
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
                    
                    <div className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
                      {pkg.credits}
                    </div>
                    <div className="text-sm text-[var(--color-text-tertiary)] mb-4">кредитов</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                      {pkg.price}₽
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mb-6">
                      {(pkg.price / pkg.credits).toFixed(2)}₽ за кредит
                    </div>
                    
                    <Button 
                      variant={pkg.popular ? "primary" : "secondary"} 
                      className={cn("w-full", pkg.popular && "shadow-lg shadow-purple-500/20")}
                    >
                      Купить
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
                q: 'Можно ли отменить подписку?',
                a: 'Да, вы можете отменить подписку в любой момент. Доступ сохранится до конца оплаченного периода.',
              },
              {
                q: 'Есть ли возврат средств?',
                a: 'Мы возвращаем деньги в течение 14 дней, если вы не использовали кредиты.',
              },
              {
                q: 'Можно ли перенести кредиты на следующий месяц?',
                a: 'Да, неиспользованные кредиты переносятся на следующий месяц для подписчиков Creator и Business.',
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
    </div>
  );
}
