'use client';

import Link from 'next/link';
import { ArrowRight, Play, Image as ImageIcon, Video, Music, Sparkles } from 'lucide-react';

/**
 * Статичный shell до загрузки основного чанка главной.
 * Desktop: новый hero-кадр редизайна.
 * Mobile: прежний hero для совместимости.
 */
export function HomePageShell() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      {/* Desktop shell */}
      <section className="hidden lg:flex relative min-h-screen items-center justify-center bg-[#0a0c08] px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_-10%,rgba(140,244,37,0.1),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(64,121,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-[#8cf425]">
            <Sparkles className="w-3.5 h-3.5" />
            Новые модели еженедельно
          </span>

          <h1 className="mt-6 text-[clamp(3rem,6vw,5.5rem)] font-black leading-[1.05] tracking-tight">
            Собери свой кадр.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8cf425] via-lime-200 to-emerald-400">
              Сгенерируй свой фильм.
            </span>
          </h1>

          <p className="mt-6 text-xl text-white/65 max-w-3xl mx-auto">
            Профессиональная AI-генерация видео и фото в одной студии.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/create/studio?section=video" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#8cf425] text-black font-bold">
              Создать видео
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors">
              Тарифы
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile shell (legacy) */}
      <section className="lg:hidden relative h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0b]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0b]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#8cf425] opacity-75" />
              <span className="relative rounded-full h-2.5 w-2.5 bg-[#8cf425]" />
            </span>
            <span className="text-sm md:text-base text-white/70">25+ нейросетей • Без карты • 50⭐ бесплатно</span>
          </div>

          <h1 className="text-[clamp(3rem,12vw,7rem)] font-black leading-[0.9] tracking-tight mb-6">
            <span className="text-white">Создай свой</span>
            <br />
            <span className="bg-gradient-to-r from-[#8cf425] via-lime-200 to-emerald-400 bg-clip-text text-transparent">
              AI шедевр
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Профессиональные фото, кинематографичное видео и музыка — всё создаётся за секунды с помощью лучших нейросетей мира
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-10 text-sm md:text-base text-white/40">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#8cf425]" /> Фото до 4K
            </span>
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#8cf425]" /> Видео со звуком
            </span>
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#f472b6]" /> Музыка любого жанра
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create/studio?section=photo"
              className="group relative px-10 py-5 rounded-2xl bg-[#8cf425] text-black font-bold text-lg inline-flex items-center gap-3"
            >
              Начать создавать
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/create/studio?section=photo&model=nano-banana-pro"
              className="flex items-center gap-2 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 font-medium text-lg transition-all"
            >
              <Play className="w-5 h-5" />
              Открыть генератор
            </Link>
          </div>

          <p className="mt-8 text-sm text-white/30">Вход через Telegram • Мгновенный старт • Поддержка 24/7</p>
        </div>
      </section>
    </div>
  );
}
