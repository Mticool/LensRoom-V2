'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Crown, Zap, Loader2, Star, CheckCircle2, Tag, X, Check, Gift } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  
  // Promocode state
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoResult, setPromoResult] = useState<PromocodeResult | null>(null);

  const validatePromocode = useCallback(async () => {
    if (!promoCode.trim()) {
      toast.error('Введите промокод');
      return;
    }

    setPromoValidating(true);
    setPromoResult(null);

    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка проверки');
      }

      setPromoResult(data);

      if (data.valid) {
        toast.success('Промокод применён!');
      } else {
        toast.error(data.error || 'Промокод недействителен');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка проверки промокода');
      setPromoResult({ valid: false, error: error.message });
    } finally {
      setPromoValidating(false);
    }
  }, [promoCode]);

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
    setPromoExpanded(false);
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
        body: JSON.stringify({ type, itemId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Show user-friendly error messages
        if (response.status === 401) {
          setAuthDialogOpen(true);
          toast.error(user ? 'Сессия истекла. Войдите снова.' : 'Войдите чтобы оформить покупку');
          setLoading(null);
          return;
        }
        if (response.status === 503) {
          const missing = Array.isArray((data as any)?.missingEnv) ? (data as any).missingEnv.join(', ') : '';
          const msg =
            typeof (data as any)?.error === 'string' && (data as any).error
              ? (data as any).error
              : 'Оплата временно недоступна. Напишите в поддержку.';
          toast.error(missing ? `${msg} (${missing})` : msg);
        } else {
          throw new Error(data.error || 'Ошибка при создании платежа');
        }
        setLoading(null);
        return;
      }

      // Redirect to payment provider
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
                Оплата только за генерации. Начните с {SUBSCRIPTION_TIERS[0]?.name} — от {formatPrice(SUBSCRIPTION_TIERS[0]?.price || 0)}.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 max-w-6xl mx-auto">
          {SUBSCRIPTION_TIERS.map((plan, index) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
            const isPopular = !!plan.popular;
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
                    "relative p-6 rounded-2xl transition-all motion-reduce:transition-none h-full flex flex-col",
                    isPopular
                      ? 'bg-[var(--surface)] border-2 border-[#FFD700] shadow-2xl shadow-[#FFD700]/30'
                      : 'bg-[var(--surface)] border-2 border-white/20 hover:border-white/40'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FFD700] text-black text-xs font-bold rounded-full shadow-md">
                      Лучший выбор
                    </div>
                  )}

                  <div className={cn("text-center mb-4", isPopular && "pt-2")}>
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-[var(--text)] text-2xl mb-1">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-bold text-[var(--text)]">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-[var(--muted)]">₽/мес</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                      <span className="text-sm font-bold text-white">{plan.stars} ⭐</span>
                    </div>
                  </div>

                  {/* Subtitle */}
                  {plan.subtitle && (
                    <p className="text-sm text-[var(--text2)] leading-relaxed mb-5 text-center">
                      {plan.subtitle}
                    </p>
                  )}

                  {/* Benefits */}
                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-3">
                        Что вы выигрываете:
                      </h4>
                      <ul className="space-y-2.5">
                        {plan.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                            <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="leading-snug">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Capacity */}
                  {plan.capacity && plan.capacity.length > 0 && (
                    <div className="mb-6 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-2">
                        Хватит примерно на:
                      </h4>
                      <ul className="space-y-1.5">
                        {plan.capacity.map((item, i) => {
                          // Выделяем числа жирным
                          const formatted = item.replace(/(\d+)/g, '<strong class="text-white font-bold">$1</strong>');
                          return (
                            <li key={i} className="text-xs text-[var(--text2)] leading-relaxed">
                              <span dangerouslySetInnerHTML={{ __html: formatted }} />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto">
                    <Button
                      className={cn(
                        "w-full font-semibold",
                        isPopular
                          ? 'bg-[#FFD700] text-black hover:bg-[#FFC700] shadow-lg shadow-[#FFD700]/40'
                          : 'bg-white text-black hover:bg-white/90 shadow-md'
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
                        'Выбрать Pro ⭐'
                      ) : (
                        'Выбрать Business'
                      )}
                    </Button>
                  </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className={cn(
                      "relative p-5 rounded-2xl transition-all motion-reduce:transition-none text-center h-full flex flex-col",
                      pkg.popular
                        ? 'bg-[var(--surface)] border-2 border-[#FFD700] shadow-lg shadow-[#FFD700]/30'
                        : 'bg-[var(--surface)] border-2 border-white/20 hover:border-white/40'
                    )}
                  >
                    {bonusPercent > 0 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#FFD700] text-black text-xs font-bold rounded-full shadow-md">
                        +{bonusPercent}% бонус
                      </div>
                    )}
                    
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-[var(--text)] text-xl mb-3">
                        {pkg.id === 'mini' ? 'Mini' : pkg.id === 'plus' ? 'Plus' : pkg.id === 'max' ? 'Max' : 'Ultra'}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 mb-3">
                        <span className="text-5xl font-bold text-[var(--text)]">{totalStars}</span>
                        <Star className="w-6 h-6 text-[#FFD700] fill-[#FFD700]" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-2">
                        {formatPrice(pkg.price)}
                      </div>
                      {bonusPercent > 0 && (
                        <p className="text-xs text-emerald-400 font-semibold mb-3">
                          +{totalStars - pkg.stars}⭐ бонусом
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    {pkg.description && (
                      <p className="text-sm text-[var(--text2)] leading-relaxed mb-3 flex-1">
                        {pkg.description}
                      </p>
                    )}

                    {/* Capacity */}
                    {pkg.capacity && (
                      <div className="mb-4 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <p className="text-xs text-[var(--text2)] leading-relaxed">
                          <span className="font-semibold text-[var(--muted)]">Примерно:</span><br />
                          {pkg.capacity}
                        </p>
                      </div>
                    )}
                    
                    <Button
                      className={cn(
                        "w-full font-semibold mt-auto",
                        pkg.popular
                          ? 'bg-[#FFD700] text-black hover:bg-[#FFC700] shadow-lg shadow-[#FFD700]/30'
                          : 'bg-white text-black hover:bg-white/90 shadow-md'
                      )}
                      onClick={() => handlePurchase('package', pkg.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        `Купить за ${formatPrice(pkg.price)}`
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Soft Sell Advice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#FFD700]/10 via-transparent to-transparent border-2 border-[#FFD700]/20">
              <h3 className="text-2xl font-bold text-[var(--text)] mb-6 text-center">
                Как выбрать? 🤔
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-[var(--text)]">
                  <span className="text-2xl shrink-0">👉</span>
                  <p className="leading-relaxed">
                    <strong className="text-white">Только пробуете?</strong> Берите <strong className="text-[#FFD700]">Star</strong> — почувствуете темп.
                  </p>
                </li>
                <li className="flex items-start gap-3 text-[var(--text)]">
                  <span className="text-2xl shrink-0">👉</span>
                  <p className="leading-relaxed">
                    <strong className="text-white">Делаете контент стабильно?</strong> <strong className="text-[#FFD700]">Pro</strong> — лучший баланс цены и объёма.
                  </p>
                </li>
                <li className="flex items-start gap-3 text-[var(--text)]">
                  <span className="text-2xl shrink-0">👉</span>
                  <p className="leading-relaxed">
                    <strong className="text-white">Нужен поток и масштаб?</strong> <strong className="text-[#FFD700]">Business</strong> — чтобы не упираться в лимиты.
                  </p>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Info Text */}
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <p className="text-sm text-[var(--text2)] leading-relaxed">
              ⭐ — внутренняя валюта LensRoom. Монеты списываются только за запуск генерации.
              <br />
              Стоимость зависит от модели и режима (фото/видео/длина/качество).
            </p>
          </div>

          {/* Promocode Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 max-w-md mx-auto"
          >
            <div className="p-6 rounded-2xl bg-[var(--surface)] border-2 border-white/15">
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
                    {promoResult.description && (
                      <p className="text-xs text-emerald-300/70 truncate">{promoResult.description}</p>
                    )}
                  </div>
                  <button
                    onClick={clearPromocode}
                    className="p-1 text-emerald-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && applyBonusStars()}
                        placeholder="WELCOME50"
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 font-mono uppercase"
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
                        'Активировать'
                      )}
                    </Button>
                  </div>
                  {promoResult && !promoResult.valid && promoResult.error && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {promoResult.error}
                    </p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    Введите промокод для получения бонусных звёзд или скидки
                  </p>
                </div>
              )}
            </div>
          </motion.div>
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
                className="p-6 rounded-2xl bg-[var(--surface)] border-2 border-white/15 hover:border-white/30 transition-colors motion-reduce:transition-none"
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