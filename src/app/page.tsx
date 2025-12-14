'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Star,
  Zap,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EffectsGallery } from '@/components/home/EffectsGallery';
import { SUBSCRIPTIONS } from '@/lib/pricing-config';

// ===== HERO =====
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16">
      {/* Abstract background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/8 via-[var(--gold)]/3 to-transparent rounded-full blur-[120px]" />
        </div>
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div className="max-w-xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              <span className="text-[var(--text)]">Создавайте</span>
              <br />
              <span className="text-[var(--gold)]">магию с AI</span>
            </h1>
            
            <p className="text-xl text-[var(--text2)] mb-8 leading-relaxed">
              Фото и видео с помощью лучших нейросетей мира.
              <br />
              Всё в одном месте.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                asChild
                size="lg" 
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold text-base h-12 px-8"
              >
                <Link href="/create">
                  Создать
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--gold)]" />
                50⭐ бесплатно
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--gold)]" />
                Без карты
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--gold)]" />
                Коммерческое использование
              </span>
            </div>
          </div>

          {/* Right - Abstract visual */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-[400px] h-[400px]">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
              {/* Middle ring */}
              <div className="absolute inset-8 rounded-full border border-[var(--gold)]/20" />
              {/* Inner glow */}
              <div className="absolute inset-16 rounded-full bg-gradient-to-br from-[var(--gold)]/10 to-transparent blur-xl" />
              {/* Center orb */}
              <div className="absolute inset-24 rounded-full bg-[var(--surface)] border border-[var(--gold)]/30 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-[var(--gold)]" />
              </div>
              {/* Floating dots */}
              <div className="absolute top-12 right-12 w-2 h-2 rounded-full bg-[var(--gold)]/60" />
              <div className="absolute bottom-20 left-8 w-1.5 h-1.5 rounded-full bg-[var(--gold)]/40" />
              <div className="absolute top-1/2 right-4 w-1 h-1 rounded-full bg-[var(--gold)]/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== HOW IT WORKS =====
function HowItWorks() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Steps - inline */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-sm font-bold">
                1
              </div>
              <span className="text-[var(--text)] font-medium">Выберите модель</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted)] hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-sm font-bold">
                2
              </div>
              <span className="text-[var(--text)] font-medium">Опишите идею</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted)] hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-sm font-bold">
                3
              </div>
              <span className="text-[var(--text)] font-medium">Получите результат</span>
            </div>
          </div>

          {/* Stats - compact */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-[var(--muted)] text-sm">14 AI моделей</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-[var(--muted)] text-sm">10K+ генераций</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-[var(--muted)] text-sm">~30с на результат</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== PRICING =====
function Pricing() {
  const displayPlans = SUBSCRIPTIONS.slice(0, 3);

  return (
    <section className="py-24 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-4">
            Тарифы
          </h2>
          <p className="text-[var(--muted)] text-lg">
            50⭐ при регистрации бесплатно
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl transition-all ${
                plan.popular
                  ? 'bg-[var(--surface)] border-2 border-[var(--gold)] scale-105 shadow-lg'
                  : 'bg-[var(--surface)] border border-[var(--border)]'
              }`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="font-bold text-[var(--text)] text-xl mb-3">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-[var(--text)]">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-[var(--muted)]">₽/мес</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
                  <span className="text-sm font-semibold text-[var(--gold)]">{plan.credits} ⭐</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${
                  plan.popular
                    ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]'
                    : 'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)]'
                }`}
              >
                <Link href="/pricing">Выбрать</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== FINAL CTA =====
function FinalCTA() {
  return (
    <section className="py-32 relative">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[600px] h-[300px] bg-[var(--gold)]/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-[var(--text)]">Начать бесплатно</span>
            <br />
            <span className="text-[var(--gold)]">50⭐ сразу</span>
          </h2>
          
          <Button 
            asChild
            size="lg" 
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold text-base h-12 px-10"
          >
            <Link href="/create">
              <Sparkles className="w-4 h-4 mr-2" />
              Создать
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <Hero />
      <EffectsGallery />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
    </main>
  );
}
