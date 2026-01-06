'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Crown, Zap, Loader2, Star, CheckCircle2, Tag, X, Check, Gift,
  ChevronLeft, ChevronRight, Infinity, Shield, Clock, Users
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { SUBSCRIPTION_TIERS, STAR_PACKS, formatPrice, packBonusPercent, packTotalStars } from '@/config/pricing';
import { toast } from 'sonner';
import { LoginDialog } from '@/components/auth/login-dialog';

// Promocode types
interface PromocodeResult {
  valid: boolean;
  error?: string;
  promocode_id?: string;
  bonus_type?: string;
  bonus_value?: number;
  description?: string;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activePlanIndex, setActivePlanIndex] = useState(1); // Start with popular plan
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Promocode state
  const [promoCode, setPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoResult, setPromoResult] = useState<PromocodeResult | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Only monthly pricing
  const getPrice = (monthlyPrice: number) => monthlyPrice;

  const applyBonusStars = useCallback(async () => {
    if (!promoCode.trim()) return;

    setPromoApplying(true);

    try {
      const res = await fetch('/api/promocodes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка применения');
      }

      setPromoResult({ valid: true, ...data });
      toast.success(data.message || `Получено +${data.bonus_value} ⭐`);
      setPromoCode('');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка применения промокода');
    } finally {
      setPromoApplying(false);
    }
  }, [promoCode]);

  const clearPromocode = () => {
    setPromoResult(null);
    setPromoCode('');
  };

  const formatBonusValue = (type: string, value: number) => {
    switch (type) {
      case 'bonus_stars': return `+${value} ⭐`;
      case 'percent_discount': return `-${value}%`;
      case 'fixed_discount': return `-${value} ₽`;
      case 'multiplier': return `x${value}`;
      default: return value;
    }
  };

  const handlePurchase = async (type: 'subscription' | 'package', itemId: string) => {
    setLoading(itemId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          itemId
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        if (response.status === 401) {
          setAuthDialogOpen(true);
          toast.error(user ? 'Сессия истекла. Войдите снова.' : 'Войдите чтобы оформить покупку');
          setLoading(null);
          return;
        }
        if (response.status === 503) {
          toast.error('Оплата временно недоступна. Напишите в поддержку.');
        } else {
          throw new Error(data.error || 'Ошибка при создании платежа');
        }
        setLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Payment URL not received');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при создании платежа';
      toast.error(message);
      setLoading(null);
    }
  };

  // Mobile slider navigation
  const scrollToPlan = (index: number) => {
    if (sliderRef.current) {
      const planWidth = sliderRef.current.scrollWidth / SUBSCRIPTION_TIERS.length;
      sliderRef.current.scrollTo({
        left: planWidth * index,
        behavior: 'smooth'
      });
      setActivePlanIndex(index);
    }
  };

  const planIcons = {
    creator: Sparkles,
    creator_plus: Crown,
    business: Zap,
  };

  const planColors = {
    creator: { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
    creator_plus: { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/50', accent: 'text-amber-400' },
    business: { bg: 'from-violet-500/20 to-violet-500/5', border: 'border-violet-500/30', accent: 'text-violet-400' },
  };

  const FAQ_ITEMS = [
    {
      q: 'Что такое ⭐ (звёзды)?',
      a: '⭐ — внутренняя валюта LensRoom. Вы видите цену заранее и платите только за запуск генерации. Разные модели стоят по-разному.',
    },
    {
      q: 'Чем отличается подписка от пакета ⭐?',
      a: 'Подписка — ежемесячный план с фиксированным количеством ⭐ и доступом к Pro-функциям. Пакеты — разовая покупка ⭐ без срока действия.',
    },
    {
      q: 'Что значит "безлимит" в Creator+ и Business?',
      a: 'Nano Banana Pro 1–2K входит в тариф без ограничений по количеству в рамках разумного использования. 4K-режим оплачивается отдельно.',
    },
    {
      q: 'А если генерация не получилась — вернёте ⭐?',
      a: 'Если произошла техническая ошибка на нашей стороне — да, ⭐ вернутся автоматически.',
    },
    {
      q: 'Какие способы оплаты?',
      a: 'Принимаем карты Visa, Mastercard, МИР, а также СБП и электронные кошельки через Robokassa.',
    },
    {
      q: 'Есть ли возврат средств?',
      a: 'Мы возвращаем деньги в течение 14 дней, если вы не использовали ⭐.',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/5 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 sm:px-6 pt-24 pb-12 relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <Badge className="mb-4 px-4 py-1.5 bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
              Простое ценообразование
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] mb-4">
              Выберите свой тариф
            </h1>
            <p className="text-base sm:text-lg text-[var(--text2)] max-w-xl mx-auto">
              Платите только за генерации. Без скрытых комиссий.
            </p>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-10 text-sm text-[var(--muted)]"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Возврат 14 дней</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--gold)]" />
              <span>Отмена в любой момент</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span>5000+ пользователей</span>
            </div>
          </motion.div>

          {/* Mobile Plan Navigation */}
          <div className="flex lg:hidden justify-center gap-2 mb-4">
            {SUBSCRIPTION_TIERS.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToPlan(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  activePlanIndex === index
                    ? "bg-[var(--gold)] w-6"
                    : "bg-[var(--border)] hover:bg-[var(--muted)]"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="container mx-auto px-4 sm:px-6 pb-16">
        {/* Mobile Slider */}
        <div
          ref={sliderRef}
          className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const index = Math.round(target.scrollLeft / (target.scrollWidth / SUBSCRIPTION_TIERS.length));
            setActivePlanIndex(index);
          }}
        >
          {SUBSCRIPTION_TIERS.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              loading={loading}
              onPurchase={handlePurchase}
              planIcons={planIcons}
              planColors={planColors}
              isMobile={true}
            />
          ))}
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-3 gap-6 max-w-6xl mx-auto">
          {SUBSCRIPTION_TIERS.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              loading={loading}
              onPurchase={handlePurchase}
              planIcons={planIcons}
              planColors={planColors}
              isMobile={false}
            />
          ))}
        </div>
      </div>

      {/* Star Packs */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)]/30">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text)] mb-3">
              Пакеты ⭐ без подписки
            </h2>
            <p className="text-[var(--text2)]">
              Разовая покупка — звёзды не сгорают
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {STAR_PACKS.map((pkg, index) => {
              const isLoading = loading === pkg.id;
              const totalStars = packTotalStars(pkg);
              const bonusPercent = packBonusPercent(pkg);
              
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={cn(
                      "relative p-4 sm:p-5 rounded-2xl transition-all h-full flex flex-col text-center",
                      pkg.popular
                        ? 'bg-gradient-to-b from-[var(--gold)]/10 to-transparent border-2 border-[var(--gold)]/50 shadow-lg shadow-[var(--gold)]/10'
                        : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--gold)]/30'
                    )}
                  >
                    {bonusPercent > 0 && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[var(--gold)] text-black text-[10px] sm:text-xs font-bold rounded-full">
                        +{bonusPercent}%
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl sm:text-3xl font-bold text-[var(--text)]">{totalStars}</span>
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)] fill-[var(--gold)]" />
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-[var(--text)]">
                        {formatPrice(pkg.price)}
                      </div>
                    </div>

                    {pkg.capacity && (
                      <p className="text-[10px] sm:text-xs text-[var(--muted)] mb-3 flex-1">
                        {pkg.capacity}
                      </p>
                    )}
                    
                    <Button
                      size="sm"
                      className={cn(
                        "w-full font-medium text-xs sm:text-sm",
                        pkg.popular
                          ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      )}
                      onClick={() => handlePurchase('package', pkg.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Купить'}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Promocode Section */}
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-[var(--gold)]" />
              <h3 className="font-semibold text-[var(--text)]">Есть промокод?</h3>
            </div>

            {promoResult?.valid ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">{promoCode}</span>
                    <span className="text-sm text-emerald-300">
                      {promoResult.bonus_type && promoResult.bonus_value
                        ? formatBonusValue(promoResult.bonus_type, promoResult.bonus_value)
                        : ''}
                    </span>
                  </div>
                </div>
                <button onClick={clearPromocode} className="p-1 text-emerald-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyBonusStars()}
                    placeholder="WELCOME50"
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 font-mono uppercase text-sm"
                  />
                </div>
                <Button
                  onClick={applyBonusStars}
                  disabled={promoValidating || promoApplying || !promoCode.trim()}
                  className="shrink-0 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                >
                  {promoValidating || promoApplying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'OK'
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* FAQ */}
      <div className="border-t border-[var(--border)]">
        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-3">
              Частые вопросы
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-2">
            {FAQ_ITEMS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--gold)]/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium text-[var(--text)]">{faq.q}</h3>
                    <ChevronRight className={cn(
                      "w-5 h-5 text-[var(--muted)] transition-transform shrink-0",
                      faqOpen === i && "rotate-90"
                    )} />
                  </div>
                  <AnimatePresence>
                    {faqOpen === i && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="text-sm text-[var(--text2)] mt-3 overflow-hidden"
                      >
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Auth Dialog */}
      <LoginDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />

      {/* Hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Plan Card Component
interface PlanCardProps {
  plan: typeof SUBSCRIPTION_TIERS[0];
  index: number;
  loading: string | null;
  onPurchase: (type: 'subscription' | 'package', itemId: string) => void;
  planIcons: Record<string, any>;
  planColors: Record<string, { bg: string; border: string; accent: string }>;
  isMobile: boolean;
}

function PlanCard({
  plan,
  index,
  loading,
  onPurchase,
  planIcons,
  planColors,
  isMobile,
}: PlanCardProps) {
  const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
  const colors = planColors[plan.id as keyof typeof planColors] || planColors.creator;
  const isPopular = !!plan.popular;
  const isLoading = loading === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        isMobile && "min-w-[85vw] snap-center"
      )}
    >
      <div
        className={cn(
          "relative p-5 sm:p-6 rounded-2xl h-full flex flex-col",
          "bg-gradient-to-b",
          colors.bg,
          "border-2",
          isPopular ? "border-[var(--gold)] shadow-xl shadow-[var(--gold)]/20" : colors.border
        )}
      >
        {/* Popular Badge */}
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-full shadow-lg">
            Популярный
          </div>
        )}

        {/* Header */}
        <div className={cn("text-center mb-5", isPopular && "pt-2")}>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
            isPopular ? "bg-[var(--gold)]/20" : "bg-white/10"
          )}>
            <Icon className={cn("w-6 h-6", isPopular ? "text-[var(--gold)]" : "text-white")} />
          </div>
          <h3 className="font-bold text-[var(--text)] text-xl sm:text-2xl mb-1">{plan.name}</h3>
          
          {/* Price */}
          <div className="mb-2">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl sm:text-4xl font-bold text-[var(--text)]">
                {plan.price.toLocaleString()}
              </span>
              <span className="text-[var(--muted)]">₽/мес</span>
            </div>
          </div>

          {/* Stars */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
            <span className="text-sm font-bold text-white">
              {plan.stars.toLocaleString()} ⭐
            </span>
            <span className="text-xs text-[var(--muted)]">/мес</span>
          </div>
        </div>

        {/* Included Feature Highlight */}
        <div className={cn(
          "mb-4 p-3 rounded-xl text-center",
          plan.id === 'creator' 
            ? "bg-emerald-500/10 border border-emerald-500/30"
            : "bg-[var(--gold)]/10 border border-[var(--gold)]/30"
        )}>
          {plan.id === 'creator' ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Nano Banana включён</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Infinity className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-sm font-medium text-[var(--gold)]">Pro 1-2K безлимит</span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-5 flex-1">
          {plan.capacity?.slice(0, 3).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button
          className={cn(
            "w-full font-semibold h-11",
            isPopular
              ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 shadow-lg shadow-[var(--gold)]/30'
              : 'bg-white text-black hover:bg-white/90'
          )}
          onClick={() => onPurchase('subscription', plan.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Выбрать ${plan.name}`
          )}
        </Button>
      </div>
    </motion.div>
  );
}
