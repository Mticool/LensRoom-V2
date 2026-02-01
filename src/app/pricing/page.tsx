'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Star, Loader2, Check, ChevronDown, ChevronRight,
  Zap, Crown, Rocket, Shield, Clock, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { 
  SUBSCRIPTION_TIERS, 
  COMPARISON_TABLE,
  PRICING_FOOTNOTES,
  formatPrice,
  type PricingTier,
  type ComparisonRow
} from '@/config/pricing';
import { toast } from 'sonner';
import { LoginDialog } from '@/components/auth/login-dialog';

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activePlanIndex, setActivePlanIndex] = useState(1);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const scrollToComparison = () => {
    comparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePurchase = async (planId: string) => {
    setLoading(planId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription', itemId: planId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        if (response.status === 401) {
          setAuthDialogOpen(true);
          toast.error(user ? 'Сессия истекла. Войдите снова.' : 'Войдите чтобы оформить подписку');
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
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка');
      setLoading(null);
    }
  };

  const scrollToPlan = (index: number) => {
    if (sliderRef.current) {
      const planWidth = sliderRef.current.scrollWidth / SUBSCRIPTION_TIERS.length;
      sliderRef.current.scrollTo({ left: planWidth * index, behavior: 'smooth' });
      setActivePlanIndex(index);
    }
  };

  const planIcons = { start: Zap, pro: Crown, max: Rocket };
  const planColors = {
    start: 'from-zinc-500/20 to-zinc-800/10',
    pro: 'from-amber-500/20 to-amber-900/10',
    max: 'from-violet-500/20 to-violet-900/10',
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        
        <div className="container mx-auto px-4 pt-20 pb-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Выберите тариф
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Все нейросети. Одна подписка. Прозрачные цены.
            </p>
          </motion.div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-zinc-500"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Возврат 14 дней</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Отмена в любой момент</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Обновления каждую неделю</span>
            </div>
          </motion.div>

          {/* Mobile dots */}
          <div className="flex lg:hidden justify-center gap-2 mb-4">
            {SUBSCRIPTION_TIERS.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToPlan(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  activePlanIndex === index ? "bg-white w-6" : "bg-zinc-700"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="container mx-auto px-4 pb-16">
        {/* Mobile Slider */}
        <div
          ref={sliderRef}
          className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none' }}
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
              onCompare={scrollToComparison}
            />
          ))}
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-3 gap-6 max-w-5xl mx-auto">
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
              onCompare={scrollToComparison}
            />
          ))}
        </div>

        {/* Footnotes under plans */}
        <div className="max-w-3xl mx-auto mt-8 text-xs text-zinc-500 space-y-1">
          {PRICING_FOOTNOTES.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div ref={comparisonRef} className="border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Сравнение тарифов
            </h2>
            <p className="text-zinc-400">Полный список возможностей</p>
          </motion.div>

          {/* Desktop Table */}
          <div className="hidden md:block max-w-4xl mx-auto">
            <ComparisonTableDesktop rows={COMPARISON_TABLE} />
          </div>

          {/* Mobile Accordion */}
          <div className="md:hidden space-y-2">
            <MobileAccordion
              title="Общее"
              rows={COMPARISON_TABLE.filter(r => r.category === 'general')}
              isOpen={mobileAccordion === 'general'}
              onToggle={() => setMobileAccordion(mobileAccordion === 'general' ? null : 'general')}
            />
            <MobileAccordion
              title="Видео модели"
              rows={COMPARISON_TABLE.filter(r => r.category === 'video')}
              isOpen={mobileAccordion === 'video'}
              onToggle={() => setMobileAccordion(mobileAccordion === 'video' ? null : 'video')}
            />
            <MobileAccordion
              title="Фото модели"
              rows={COMPARISON_TABLE.filter(r => r.category === 'image')}
              isOpen={mobileAccordion === 'image'}
              onToggle={() => setMobileAccordion(mobileAccordion === 'image' ? null : 'image')}
            />
          </div>

          {/* Footnotes under table */}
          <div className="max-w-3xl mx-auto mt-8 text-xs text-zinc-500 space-y-1">
            {PRICING_FOOTNOTES.map((note, i) => (
              <p key={i}>{note}</p>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <FAQ />

      <LoginDialog isOpen={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// Plan Card
interface PlanCardProps {
  plan: PricingTier;
  index: number;
  loading: string | null;
  onPurchase: (planId: string) => void;
  planIcons: Record<string, any>;
  planColors: Record<string, string>;
  isMobile: boolean;
  onCompare: () => void;
}

function PlanCard({ plan, index, loading, onPurchase, planIcons, planColors, isMobile, onCompare }: PlanCardProps) {
  const Icon = planIcons[plan.id as keyof typeof planIcons] || Zap;
  const gradient = planColors[plan.id as keyof typeof planColors] || planColors.start;
  const isPopular = !!plan.popular;
  const isLoading = loading === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(isMobile && "min-w-[85vw] snap-center")}
    >
      <div
        className={cn(
          "relative p-6 rounded-2xl h-full flex flex-col",
          "bg-gradient-to-b border",
          gradient,
          isPopular 
            ? "border-amber-500/50 shadow-lg shadow-amber-500/10" 
            : "border-zinc-800"
        )}
      >
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
            Популярный
          </div>
        )}

        <div className={cn("text-center mb-5", isPopular && "pt-2")}>
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
            isPopular ? "bg-amber-500/20" : "bg-zinc-800"
          )}>
            <Icon className={cn("w-6 h-6", isPopular ? "text-amber-400" : "text-zinc-400")} />
          </div>
          
          <h3 className="font-bold text-white text-2xl mb-1">{plan.name}</h3>
          
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-3xl font-bold text-white">{formatPrice(plan.price)}</span>
            <span className="text-zinc-500">₽/мес</span>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-semibold text-white">+{plan.stars.toLocaleString()}⭐ / мес</span>
          </div>
        </div>

        <div className="mb-5 flex-1">
          <ul className="space-y-2.5">
            {plan.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Button
            className={cn(
              "w-full font-semibold h-11",
              isPopular
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-white text-black hover:bg-zinc-200'
            )}
            onClick={() => onPurchase(plan.id)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Выбрать ${plan.name}`}
          </Button>
          
          <button
            onClick={onCompare}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition py-1"
          >
            Сравнить тарифы →
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Desktop Comparison Table
function ComparisonTableDesktop({ rows }: { rows: ComparisonRow[] }) {
  const categories = [
    { key: 'general', label: 'Общее' },
    { key: 'video', label: 'Видео модели' },
    { key: 'image', label: 'Фото модели' },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 bg-zinc-900/80">
        <div className="p-4 text-sm font-medium text-zinc-400"></div>
        <div className="p-4 text-center text-sm font-bold text-zinc-300">START</div>
        <div className="p-4 text-center text-sm font-bold text-amber-400 bg-amber-500/5">PRO</div>
        <div className="p-4 text-center text-sm font-bold text-violet-400">MAX</div>
      </div>

      {categories.map((cat) => (
        <div key={cat.key}>
          <div className="grid grid-cols-4 bg-zinc-800/50">
            <div className="col-span-4 p-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {cat.label}
            </div>
          </div>
          {rows.filter(r => r.category === cat.key).map((row, i) => (
            <div key={i} className="grid grid-cols-4 border-t border-zinc-800/50 hover:bg-zinc-800/20">
              <div className="p-3 text-sm text-zinc-300">{row.label}</div>
              <TableCell value={row.start} />
              <TableCell value={row.pro} highlight />
              <TableCell value={row.max} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TableCell({ value, highlight }: { value: string; highlight?: boolean }) {
  const isCheck = value === '✓';
  const isDash = value === '—';
  
  return (
    <div className={cn(
      "p-3 text-center text-sm",
      highlight && "bg-amber-500/5"
    )}>
      {isCheck ? (
        <Check className="w-4 h-4 text-emerald-400 mx-auto" />
      ) : isDash ? (
        <span className="text-zinc-600">—</span>
      ) : (
        <span className={cn(
          value.includes('Бесплатно') ? "text-emerald-400 font-medium" : 
          value.includes('⭐') ? "text-amber-400 font-medium" : "text-zinc-300"
        )}>
          {value}
        </span>
      )}
    </div>
  );
}

// Mobile Accordion
function MobileAccordion({ 
  title, 
  rows, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  rows: ComparisonRow[]; 
  isOpen: boolean; 
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-800/50"
      >
        <span className="font-medium text-white">{title}</span>
        <ChevronDown className={cn("w-5 h-5 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-t border-zinc-800">
                    <th className="p-2 text-left text-xs text-zinc-500 font-normal"></th>
                    <th className="p-2 text-center text-xs text-zinc-400 font-medium">START</th>
                    <th className="p-2 text-center text-xs text-amber-400 font-medium bg-amber-500/5">PRO</th>
                    <th className="p-2 text-center text-xs text-violet-400 font-medium">MAX</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-800/50">
                      <td className="p-2 text-xs text-zinc-300">{row.label}</td>
                      <MobileTableCell value={row.start} />
                      <MobileTableCell value={row.pro} highlight />
                      <MobileTableCell value={row.max} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileTableCell({ value, highlight }: { value: string; highlight?: boolean }) {
  const isCheck = value === '✓';
  const isDash = value === '—';
  
  return (
    <td className={cn("p-2 text-center text-xs", highlight && "bg-amber-500/5")}>
      {isCheck ? (
        <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
      ) : isDash ? (
        <span className="text-zinc-600">—</span>
      ) : (
        <span className={cn(
          value.includes('Бесплатно') ? "text-emerald-400" : 
          value.includes('⭐') ? "text-amber-400" : "text-zinc-300"
        )}>
          {value}
        </span>
      )}
    </td>
  );
}

// FAQ
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  
  const items = [
    {
      q: 'Что такое ⭐ и как их тратить?',
      a: '⭐ — универсальная валюта LensRoom. Начисляются каждый месяц и тратятся на любые генерации: видео, фото, аудио. У каждой модели своя цена в ⭐.',
    },
    {
      q: 'Что входит в "Бесплатно" NanoBanana Pro?',
      a: 'В тарифах PRO и MAX NanoBanana Pro 2K/4K включены без ограничений (fair-use). Генерируйте сколько нужно за 0⭐.',
    },
    {
      q: 'Переносятся ли ⭐ на следующий месяц?',
      a: 'Нет, ⭐ из подписки не переносятся. Используйте их до конца периода.',
    },
    {
      q: 'Что такое Motion Control?',
      a: 'Motion Control — режим Kling 2.6 для точного управления движением камеры. Доступен во всех тарифах.',
    },
    {
      q: 'Как отменить подписку?',
      a: 'В личном кабинете или напишите в поддержку. Деньги за неиспользованный период возвращаем в течение 14 дней.',
    },
  ];

  return (
    <div className="border-t border-zinc-800/50">
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Частые вопросы</h2>
        <div className="max-w-2xl mx-auto space-y-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition text-left"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-white">{item.q}</span>
                <ChevronRight className={cn("w-5 h-5 text-zinc-500 transition-transform shrink-0", open === i && "rotate-90")} />
              </div>
              <AnimatePresence>
                {open === i && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="text-sm text-zinc-400 mt-3 overflow-hidden"
                  >
                    {item.a}
                  </motion.p>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
