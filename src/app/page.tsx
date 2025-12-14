'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Star,
  Zap,
  ChevronRight,
  Clock,
  GraduationCap,
  Users,
  Target,
  BookOpen,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EffectsGallery } from '@/components/home/EffectsGallery';
import { SUBSCRIPTIONS } from '@/lib/pricing-config';
import { cn } from '@/lib/utils';

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

// ===== ACADEMY =====
const ACADEMY_STORAGE_KEY = "lensroom_academy_waitlist";

function saveToWaitlist(email: string) {
  if (typeof window === "undefined") return;
  const existing = JSON.parse(localStorage.getItem(ACADEMY_STORAGE_KEY) || "[]");
  existing.push({ email, createdAt: new Date().toISOString() });
  localStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(existing));
}

const FOR_WHO = [
  "Новичкам, кто хочет быстро научиться делать крутые ролики, даже без опыта монтажа.",
  "Контент-мейкерам и блогерам, которым нужны ролики каждый день, но без выгорания.",
  "Селлерам WB/Ozon, кто хочет поднимать конверсию карточки видео-креативами.",
  "Фрилансерам и агентствам, чтобы брать заказы на UGC/ads и масштабироваться.",
];

const WILL_LEARN = [
  "Делать UGC-ролики \"как от блогера\" и видео-рекламу под товар.",
  "Быстро собирать сценарии на 5–10 секунд: хук → выгода → доверие → CTA.",
  "Управлять качеством: первый/последний кадр, стиль, свет, динамика, \"дорогой\" визуал.",
  "Делать A/B варианты и понимать, что реально влияет на конверсию.",
  "Упаковать портфолио и начать брать первые заказы (или улучшить свои продажи).",
];

const PROGRAM = [
  { title: "База, которая экономит недели", desc: "Как устроены модели и как держать стабильный результат.", icon: BookOpen },
  { title: "Сценарии и структура продающего ролика", desc: "Формулы: хук → выгода → доверие → CTA.", icon: Target },
  { title: "Промты, которые дают премиум-картинку", desc: "Тон, свет, камера, движение, детали, запреты.", icon: Sparkles },
  { title: "UGC и реклама для товаров", desc: "Сценарии под маркетплейсы, объявления и соцсети.", icon: Users },
  { title: "Монетизация", desc: "Прайс, пакеты, общение с клиентом, выдача результата.", icon: Wallet },
];

const FORMAT_LINES = [
  "Формат: короткие уроки + практические задания",
  "Результат: готовые ролики + шаблоны промтов + чек-лист",
  "Старт: скоро",
  "Доступ: по списку ожидания (первые получат лучшие условия)",
];

function AcademyModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    saveToWaitlist(email.trim());
    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[var(--gold)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)]">Академия LensRoom</h3>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-[var(--text)] font-medium">Готово!</p>
            <p className="text-sm text-[var(--muted)] mt-1">Мы напишем, когда откроем набор.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-[var(--muted)] mb-4">
              Оставьте email — напишем, когда откроем набор. Первые получат лучшие условия.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] mb-4"
            />
            <Button
              type="submit"
              className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold"
            >
              Записаться в лист ожидания
            </Button>
            <p className="text-[10px] text-[var(--muted)] text-center mt-3">
              Без спама. Только анонс старта и условия.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Academy() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section id="academy" className="py-24 border-t border-[var(--border)] relative scroll-mt-20">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[var(--gold)]/5 to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 mb-6">
            <GraduationCap className="w-4 h-4 text-[var(--gold)]" />
            <span className="text-sm font-medium text-[var(--gold)]">Обучение</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
            Академия LensRoom
          </h2>
          <p className="text-lg text-[var(--text2)] leading-relaxed">
            Мы научим создавать видео, которые выглядят как реклама — и превращать это в доход.
            <br className="hidden sm:block" />
            <span className="text-[var(--muted)]">
              Без "магии нейросетей" и хаоса. Система: сценарий → промт → результат → упаковка → продажи.
            </span>
          </p>
        </div>

        {/* Two columns: For Who + What You'll Learn */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* For Who */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--gold)]" />
              Для кого
            </h3>
            <ul className="space-y-4">
              {FOR_WHO.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--text2)]">
                  <CheckCircle2 className="w-5 h-5 text-[var(--gold)] mt-0.5 shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What You'll Learn */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-[var(--text)] mb-5 flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--gold)]" />
              Что вы будете уметь после обучения
            </h3>
            <ul className="space-y-4">
              {WILL_LEARN.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--text2)]">
                  <CheckCircle2 className="w-5 h-5 text-[var(--gold)] mt-0.5 shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Program - 5 cards */}
        <div className="mb-16 max-w-5xl mx-auto">
          <h3 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">Программа</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PROGRAM.map((module, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--gold)]/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center mb-3">
                  <module.icon className="w-4 h-4 text-[var(--gold)]" />
                </div>
                <div className="text-xs font-bold text-[var(--gold)] mb-1">{i + 1} модуль</div>
                <h4 className="text-sm font-semibold text-[var(--text)] mb-2 leading-tight">{module.title}</h4>
                <p className="text-xs text-[var(--muted)] leading-relaxed">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Format & Conditions */}
        <div className="mb-16 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">Формат и условия</h3>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <ul className="space-y-3">
              {FORMAT_LINES.map((line, i) => (
                <li key={i} className="flex items-center gap-3 text-[var(--text2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
                  <span className="text-sm">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Block */}
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-gradient-to-b from-[var(--surface)] to-[var(--surface2)] border border-[var(--border)] rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-[var(--text)] mb-2">Хочешь в первый поток?</h3>
            <p className="text-[var(--muted)] mb-6">Оставь заявку — напишем, когда откроем набор.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Button
                onClick={() => setShowModal(true)}
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold px-6"
              >
                Записаться в лист ожидания
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(true)}
                className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--gold)]/50"
              >
                Хочу программу
              </Button>
            </div>
            
            <p className="text-[10px] text-[var(--muted)]">
              Без спама. Только анонс старта и условия.
            </p>
          </div>
        </div>
      </div>

      {showModal && <AcademyModal onClose={() => setShowModal(false)} />}
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
      <Academy />
      <FinalCTA />
    </main>
  );
}
