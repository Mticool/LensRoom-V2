'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Play, Sparkles, Star } from 'lucide-react';
import { SUBSCRIPTION_TIERS, formatPrice } from '@/config/pricing';
import {
  desktopCases,
  desktopFeatures,
  desktopGenerations,
  desktopModelBuckets,
  desktopSteps,
} from './homeDesktopData';

export function HomePageDesktop() {
  return (
    <div className="hidden lg:block min-h-screen bg-[#0a0c08] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(140,244,37,0.1),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(64,121,255,0.08),transparent_45%)]" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <main className="relative z-10 pt-28 pb-24">
        <section className="container mx-auto px-6 mb-28">
          <div className="grid grid-cols-12 gap-10 items-center">
            <div className="col-span-5">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-[#8cf425]">
                <Sparkles className="w-3.5 h-3.5" />
                Новые модели еженедельно
              </span>
              <h1 className="mt-6 text-6xl font-black leading-[1.05] tracking-tight">
                Собери свой кадр.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#8cf425] via-lime-200 to-emerald-400">
                  Сгенерируй свой фильм.
                </span>
              </h1>
              <p className="mt-6 text-lg text-white/65 max-w-xl">
                Профессиональная AI-генерация видео и фото на базе Veo, Kling, Sora и других моделей в одном интерфейсе.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/create/studio?section=video"
                  className="inline-flex items-center gap-3 rounded-full bg-[#8cf425] text-black font-bold px-7 py-4 hover:bg-[#9ffc3d] transition-colors"
                >
                  Создать видео
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 text-white px-7 py-4 hover:bg-white/10 transition-colors"
                >
                  Тарифы
                </Link>
              </div>
            </div>

            <div className="col-span-7">
              <div className="rounded-3xl border border-[#8cf425]/25 bg-[linear-gradient(145deg,rgba(25,34,16,0.72),rgba(10,12,8,0.92))] p-6 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono tracking-wider text-white/55">PROJECT: LENSROOM_STUDIO</span>
                </div>

                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-4 space-y-4">
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
                  <div className="col-span-8">
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

        <section className="container mx-auto px-6 mb-28">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Почему выбирают LensRoom</h2>
          </div>
          <div className="grid grid-cols-4 gap-5">
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

        <section className="container mx-auto px-6 mb-28">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Творческие кейсы</h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
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

        <section className="container mx-auto px-6 mb-28">
          <div className="grid grid-cols-3 gap-6">
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

        <section className="container mx-auto px-6 mb-28">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="grid grid-cols-3 gap-8">
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

        <section className="container mx-auto px-6 mb-28">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Избранные генерации</h2>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {desktopGenerations.map((item) => (
              <Link key={item.title} href={item.href} className="group relative rounded-2xl overflow-hidden border border-white/10 aspect-[3/4]">
                <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 p-4">
                  <span className="inline-flex px-2 py-0.5 rounded bg-[#8cf425]/20 text-[#8cf425] text-[10px] uppercase tracking-wide">{item.tag}</span>
                  <p className="mt-2 text-sm font-bold">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 mb-24">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold">Тарифы студии</h2>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isPopular = !!tier.popular;
              return (
                <div
                  key={tier.id}
                  className={[
                    'relative rounded-2xl p-7 border transition-colors',
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

                  <h3 className="text-2xl font-bold uppercase">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className={isPopular ? 'text-5xl font-bold text-[#8cf425]' : 'text-4xl font-bold'}>
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

        <section className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(25,34,16,0.75),rgba(10,12,8,0.95))] p-12 text-center">
            <h2 className="text-5xl font-black">Готов создавать?</h2>
            <p className="mt-4 text-lg text-white/65">Запускайте генерации в студии и управляйте качеством на каждом шаге.</p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/create/studio" className="inline-flex items-center gap-2 rounded-full bg-[#8cf425] px-8 py-4 text-black font-bold">
                Открыть студию
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/library" className="inline-flex items-center rounded-full border border-white/20 px-8 py-4 hover:bg-white/10">
                Мои работы
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
