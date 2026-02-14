'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Статичный shell до загрузки основного чанка главной.
 * Единый адаптивный hero для всех экранов.
 */
export function HomePageShell() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center bg-[#0a0c08] px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(140,244,37,0.1),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(64,121,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-[#8cf425]">
            <Sparkles className="w-3.5 h-3.5" />
            Новые модели еженедельно
          </span>

          <h1 className="mt-6 text-[clamp(2rem,8vw,5.5rem)] font-black leading-[1.05] tracking-tight">
            Собери свой кадр.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8cf425] via-lime-200 to-emerald-400">
              Сгенерируй свой фильм.
            </span>
          </h1>

          <p className="mt-6 text-base lg:text-xl text-white/65 max-w-3xl mx-auto">
            Профессиональная AI-генерация видео и фото в одной студии.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/create/studio?section=video" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#8cf425] text-black font-bold w-full sm:w-auto justify-center">
              Создать видео
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors w-full sm:w-auto justify-center">
              Тарифы
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
