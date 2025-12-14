'use client';

import { useState } from 'react';
import { SUBSCRIPTIONS, CREDIT_PACKS, REGISTRATION_BONUS, REFERRAL_BONUS } from '@/lib/pricing-config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Gift, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { ComparisonTable } from '@/components/pricing/comparison-table';
import Link from 'next/link';

export default function PricingPage() {
  const [billingType, setBillingType] = useState<'subscription' | 'onetime'>('subscription');

  return (
    <div className="min-h-screen bg-[#08080C] pt-20 pb-12">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Простые и честные цены
          </h1>
          <p className="text-xl text-white/60 mb-8">
            Выберите тариф под ваши задачи
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setBillingType('subscription')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === 'subscription'
                  ? 'bg-[#c8ff00] text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Подписки
            </button>
            <button
              onClick={() => setBillingType('onetime')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingType === 'onetime'
                  ? 'bg-[#c8ff00] text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Разовые пакеты
            </button>
          </div>
        </div>

        {/* Subscriptions */}
        {billingType === 'subscription' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-8 mb-12"
          >
            {SUBSCRIPTIONS.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden bg-white/[0.02] ${
                    sub.popular 
                      ? 'border-2 border-[#c8ff00] shadow-xl shadow-[#c8ff00]/10 scale-105' 
                      : 'border border-white/10'
                  }`}
                >
                  {sub.badge && (
                    <div className="bg-gradient-to-r from-[#c8ff00] to-yellow-400 text-black text-center py-2 text-sm font-bold">
                      {sub.badge}
                    </div>
                  )}

                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {sub.name}
                    </h3>
                    
                    <div className="mb-4">
                      <span className="text-5xl font-bold text-white">
                        {sub.price.toLocaleString()}₽
                      </span>
                      <span className="text-white/40">/мес</span>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="w-5 h-5 text-[#c8ff00]" />
                      <span className="text-lg font-semibold text-white">
                        {sub.credits} ⭐ каждый месяц
                      </span>
                    </div>

                    <p className="text-sm text-white/50 mb-6">
                      {sub.description}
                    </p>

                    <Button 
                      className={`w-full mb-6 rounded-full ${
                        sub.popular 
                          ? 'bg-[#c8ff00] text-black hover:bg-[#b8ef00]' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                      size="lg"
                      asChild
                    >
                      <Link href={`/checkout?plan=${sub.id}`}>
                        Выбрать {sub.name}
                      </Link>
                    </Button>

                    <ul className="space-y-3">
                      {sub.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 text-[#c8ff00] flex-shrink-0 mt-0.5" />
                          <span className="text-white/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* One-time Packs */}
        {billingType === 'onetime' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-8 mb-12"
          >
            {CREDIT_PACKS.map((pack, index) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden bg-white/[0.02] ${
                    pack.popular 
                      ? 'border-2 border-[#c8ff00] shadow-xl shadow-[#c8ff00]/10' 
                      : 'border border-white/10'
                  }`}
                >
                  {pack.savings && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {pack.savings}
                    </div>
                  )}

                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {pack.name}
                    </h3>
                    
                    <div className="mb-4">
                      <span className="text-5xl font-bold text-white">
                        {pack.price.toLocaleString()}₽
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="w-5 h-5 text-[#c8ff00]" />
                      <span className="text-lg font-semibold text-white">
                        {pack.credits} ⭐
                      </span>
                    </div>

                    <p className="text-sm text-white/50 mb-6">
                      {pack.description}
                    </p>

                    <Button 
                      className={`w-full rounded-full ${
                        pack.popular 
                          ? 'bg-[#c8ff00] text-black hover:bg-[#b8ef00]' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                      size="lg"
                      asChild
                    >
                      <Link href={`/checkout?pack=${pack.id}`}>
                        Купить {pack.name}
                      </Link>
                    </Button>

                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p className="text-xs text-white/40 text-center">
                        ~{Math.floor(pack.credits / 7)} фото или ~{Math.floor(pack.credits / 15)} видео
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Bonuses */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 bg-gradient-to-br from-[#c8ff00]/5 to-yellow-500/5 border-[#c8ff00]/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#c8ff00]/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-[#c8ff00]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Бонус при регистрации
                </h3>
                <p className="text-white/50 mb-3">
                  Получите {REGISTRATION_BONUS} ⭐ бесплатно сразу после регистрации. 
                  Попробуйте все модели без вложений!
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c8ff00]/10 rounded-full">
                  <Sparkles className="w-4 h-4 text-[#c8ff00]" />
                  <span className="text-sm font-medium text-[#c8ff00]">
                    +{REGISTRATION_BONUS} ⭐
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/5 to-blue-500/5 border-green-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Реферальная программа
                </h3>
                <p className="text-white/50 mb-3">
                  Пригласите друга — вы оба получите по {REFERRAL_BONUS} ⭐. 
                  Делитесь AI-магией с друзьями!
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    +{REFERRAL_BONUS} ⭐ каждому
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-white mb-8">
            Сравнение тарифов
          </h2>
          <ComparisonTable />
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-8">
            Частые вопросы
          </h2>
          
          <div className="space-y-4">
            <Card className="p-6 bg-white/[0.02] border-white/10">
              <h3 className="font-bold text-white mb-2">
                Что такое ⭐ (звёзды)?
              </h3>
              <p className="text-sm text-white/50">
                Это внутренняя валюта платформы. Каждая модель стоит определённое количество звёзд. 
                Например, фото Seedream = 7⭐, видео Sora 2 (5s) = 15⭐.
              </p>
            </Card>

            <Card className="p-6 bg-white/[0.02] border-white/10">
              <h3 className="font-bold text-white mb-2">
                Сгорают ли неиспользованные звёзды?
              </h3>
              <p className="text-sm text-white/50">
                Нет! Ваши звёзды никогда не сгорают. Накапливайте и используйте когда угодно.
              </p>
            </Card>

            <Card className="p-6 bg-white/[0.02] border-white/10">
              <h3 className="font-bold text-white mb-2">
                Можно ли отменить подписку?
              </h3>
              <p className="text-sm text-white/50">
                Да, в любой момент. Звёзды останутся с вами даже после отмены подписки.
              </p>
            </Card>

            <Card className="p-6 bg-white/[0.02] border-white/10">
              <h3 className="font-bold text-white mb-2">
                Есть ли коммерческая лицензия?
              </h3>
              <p className="text-sm text-white/50">
                Да! Все генерации можно использовать в коммерческих целях без дополнительной оплаты.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
