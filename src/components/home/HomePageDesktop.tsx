'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowRight, Check, Play, Sparkles, Star } from 'lucide-react';
import { SUBSCRIPTION_TIERS, formatPrice } from '@/config/pricing';
import {
  desktopCases,
  desktopFeatures,
  desktopGenerations,
  desktopModelBuckets,
  desktopSteps,
} from './homeDesktopData';

const ReferralInvite = dynamic(
  () => import('@/components/home/referral-invite').then((m) => ({ default: m.ReferralInvite })),
  { ssr: false }
);

export function HomePageDesktop() {
  return (
    <div className="min-h-screen bg-[#0a0c08] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(140,244,37,0.1),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(64,121,255,0.08),transparent_45%)]" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <main className="relative z-10 pt-20 lg:pt-28 pb-16 lg:pb-24">
        {/* Hero */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-10 items-center">
            <div className="lg:col-span-5 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-[#8cf425]">
                <Sparkles className="w-3.5 h-3.5" />
                Новые модели еженедельно
              </span>
              <h1 className="mt-6 text-3xl sm:text-4xl lg:text-6xl font-black leading-[1.05] tracking-tight">
                Собери свой кадр.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8cf425] via-lime-200 to-emerald-400">
                  Сгенерируй свой фильм.
                </span>
              </h1>
              <p className="mt-6 text-base lg:text-lg text-white/65 max-w-xl mx-auto lg:mx-0">
                Профессиональная AI-генерация видео и фото на базе Veo, Kling, Sora и других моделей в одном интерфейсе.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  href="/create/studio?section=video"
                  className="inline-flex items-center gap-3 rounded-full bg-[#8cf425] text-black font-bold px-7 py-4 hover:bg-[#9ffc3d] transition-colors w-full sm:w-auto justify-center"
                >
                  Создать видео
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 text-white px-7 py-4 hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
                >
                  Тарифы
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 mt-10 lg:mt-0 w-full">
              <div className="rounded-3xl border border-[#8cf425]/25 bg-[linear-gradient(145deg,rgba(25,34,16,0.72),rgba(10,12,8,0.92))] p-4 sm:p-6 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono tracking-wider text-white/55 hidden sm:block">PROJECT: LENSROOM_STUDIO</span>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:gap-5">
                  <div className="hidden sm:block sm:col-span-4 space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Модель</p>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">Veo 3.1 Fast</div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Режим</p>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">Video generation</div>
                    </div>
                    <Link
                      href="/create/studio?section=video"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8cf425] text-black font-bold py-3"
                    >
                      Генерировать
                    </Link>
                  </div>
                  <div className="sm:col-span-8">
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video">
                      <Image src="/showcase/2.jpg" alt="Studio preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/25" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Почему выбирают LensRoom</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {desktopFeatures.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#8cf425]/40 transition-colors">
                <div className="w-12 h-12 rounded-full border border-[#8cf425]/25 bg-[#8cf425]/10 flex items-center justify-center text-[#8cf425]">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cases */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Творческие кейсы</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {desktopCases.map((item) => (
              <Link key={item.title} href={item.href} className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-[#8cf425]/35 transition-colors">
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-widest text-[#8cf425]/80">{item.model}</p>
                  <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-white/60 line-clamp-3">{item.prompt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {desktopSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="inline-flex px-3 py-1 rounded-full border border-[#8cf425]/25 bg-[#8cf425]/10 text-[#8cf425] text-xs font-mono">ШАГ {String(index + 1).padStart(2, '0')}</span>
                <div className="mt-4 w-12 h-12 rounded-full border border-white/10 bg-black/25 flex items-center justify-center text-white/80">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-white/60">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Models */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {desktopModelBuckets.map((bucket) => (
                <div key={bucket.title}>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-[#8cf425] mb-6">{bucket.title}</h3>
                  <ul className="space-y-4">
                    {bucket.items.map((item) => (
                      <li key={item.name} className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-sm text-white/75">{item.name}</span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-[#8cf425]/25 bg-[#8cf425]/10 text-[#8cf425]">
                          {item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery — Masonry */}
        <section className="container mx-auto px-6 mb-16 lg:mb-28">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Избранные генерации</h2>
          </div>
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 sm:gap-3">
            {desktopGenerations.map((item, index) => {
              const aspects = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-video'] as const;
              const aspectClass = aspects[index % aspects.length];
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group relative block break-inside-avoid mb-2 sm:mb-3 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
                >
                  <div className={`relative ${aspectClass}`}>
                    <Image src={item.image} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-[#8cf425]/20 border border-[#8cf425]/30 text-[#8cf425] text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold">
                        {item.tag}
                      </span>
                      <p className="mt-1.5 text-xs sm:text-sm font-bold text-white line-clamp-2">{item.title}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Pricing */}
        <section className="container mx-auto px-6 mb-16 lg:mb-24">
          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Тарифы студии</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isPopular = !!tier.popular;
              return (
                <div
                  key={tier.id}
                  className={[
                    'relative rounded-2xl p-5 sm:p-7 border transition-colors',
                    isPopular
                      ? 'border-[#8cf425] bg-[#131611]/90 shadow-[0_0_50px_-20px_rgba(140,244,37,0.25)]'
                      : 'border-white/10 bg-[#131611]/60 hover:border-white/20',
                  ].join(' ')}
                >
                  {isPopular ? (
                    <span className="absolute top-0 right-0 rounded-bl-xl rounded-tr-2xl bg-[#8cf425] px-3 py-1 text-[10px] font-bold uppercase text-black">
                      Популярный
                    </span>
                  ) : null}

                  <h3 className="text-xl sm:text-2xl font-bold uppercase">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={isPopular ? 'text-3xl sm:text-5xl font-bold text-[#8cf425]' : 'text-3xl sm:text-4xl font-bold'}>
                      {formatPrice(tier.price)}
                    </span>
                    <span className="text-white/55">₽ / мес</span>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#8cf425]" />
                    <span className="text-sm">{tier.stars.toLocaleString('ru-RU')}⭐ ежемесячно</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-white/75">
                    {tier.highlights.slice(0, 4).map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#8cf425] mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/pricing"
                    className={[
                      'mt-7 inline-flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold uppercase tracking-wide',
                      isPopular
                        ? 'bg-[#8cf425] text-black hover:bg-[#9ffc3d]'
                        : 'border border-white/20 text-white hover:bg-white/10',
                    ].join(' ')}
                  >
                    Выбрать {tier.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Referral */}
        <ReferralInvite />

        {/* Final CTA */}
        <section className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(25,34,16,0.75),rgba(10,12,8,0.95))] p-6 sm:p-8 lg:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">Готов создавать?</h2>
            <p className="mt-4 text-base lg:text-lg text-white/65">Запускайте генерации в студии и управляйте качеством на каждом шаге.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/create/studio" className="inline-flex items-center gap-2 rounded-full bg-[#8cf425] px-8 py-4 text-black font-bold w-full sm:w-auto justify-center">
                Открыть студию
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/library" className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 hover:bg-white/10 w-full sm:w-auto">
                Мои работы
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
