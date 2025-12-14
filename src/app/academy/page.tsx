'use client';

import { useState } from 'react';
import { 
  GraduationCap,
  Users,
  Target,
  BookOpen,
  Wallet,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ===== STORAGE =====
const ACADEMY_STORAGE_KEY = "lensroom_academy_waitlist";

function saveToWaitlist(email: string) {
  if (typeof window === "undefined") return;
  const existing = JSON.parse(localStorage.getItem(ACADEMY_STORAGE_KEY) || "[]");
  existing.push({ email, createdAt: new Date().toISOString() });
  localStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(existing));
}

// ===== DATA =====
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

// ===== MODAL =====
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

// ===== PAGE =====
export default function AcademyPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="bg-[var(--bg)] min-h-screen">
      {/* Hero */}
      <section className="pt-24 pb-16 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[var(--gold)]/5 to-transparent rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 mb-6">
              <GraduationCap className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-sm font-medium text-[var(--gold)]">Обучение</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--text)] mb-6">
              Академия LensRoom
            </h1>
            <p className="text-lg text-[var(--text2)] leading-relaxed">
              Мы научим создавать видео, которые выглядят как реклама — и превращать это в доход.
              <br className="hidden sm:block" />
              <span className="text-[var(--muted)]">
                Без "магии нейросетей" и хаоса. Система: сценарий → промт → результат → упаковка → продажи.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Two columns: For Who + What You'll Learn */}
      <section className="pb-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* For Who */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-[var(--text)] mb-5 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--gold)]" />
                Для кого
              </h2>
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
              <h2 className="text-xl font-semibold text-[var(--text)] mb-5 flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--gold)]" />
                Что вы будете уметь после обучения
              </h2>
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
        </div>
      </section>

      {/* Program - 5 cards */}
      <section className="pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">Программа</h2>
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
                  <h3 className="text-sm font-semibold text-[var(--text)] mb-2 leading-tight">{module.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{module.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Format & Conditions */}
      <section className="pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-6 text-center">Формат и условия</h2>
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
        </div>
      </section>

      {/* CTA Block */}
      <section className="pb-24">
        <div className="container mx-auto px-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-gradient-to-b from-[var(--surface)] to-[var(--surface2)] border border-[var(--border)] rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Хочешь в первый поток?</h2>
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
      </section>

      {showModal && <AcademyModal onClose={() => setShowModal(false)} />}
    </main>
  );
}
