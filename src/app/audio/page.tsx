import { Metadata } from 'next';
import Link from 'next/link';
import { Music, Sparkles, Zap, Star, ArrowRight, Mic, Headphones, Wand2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Нейросети для генерации музыки и голоса онлайн',
  description: 'Создавай музыку, треки и озвучку по тексту с помощью AI. Клонируй голос и генерируй речь.',
  keywords: [
    'создание музыки ИИ',
    'генерация музыки нейросеть',
    'AI музыка генератор',
    'музыка по тексту',
    'нейросеть для музыки',
    'suno ai',
    'elevenlabs',
    'клонирование голоса',
    'озвучка текста',
    'text to speech русский',
    'создать трек онлайн',
  ],
  openGraph: {
    title: 'Нейросети для генерации музыки и голоса онлайн',
    description: 'Создавай музыку, треки и озвучку по тексту с помощью AI.',
    url: 'https://lensroom.ru/audio',
    type: 'website',
  },
  alternates: {
    canonical: '/audio',
  },
};

const AUDIO_FEATURES = [
  {
    name: 'Suno AI',
    badge: 'Music',
    description: 'Полноценные треки с вокалом и инструментами',
    price: 'от 24⭐',
  },
  {
    name: 'Клонирование голоса',
    badge: 'Voice',
    description: 'Создай копию голоса из 30-секундного образца',
    price: 'от 15⭐',
  },
  {
    name: 'Text-to-Speech',
    badge: 'TTS',
    description: 'Озвучка текста на русском и английском',
    price: 'от 5⭐',
  },
  {
    name: 'Каверы',
    badge: 'Cover',
    description: 'Перепой песню другим голосом или стилем',
    price: 'от 24⭐',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Быстрая генерация',
    description: 'Трек за 30-60 секунд',
  },
  {
    icon: Sparkles,
    title: 'Разные форматы',
    description: 'Музыка, речь, каверы',
  },
  {
    icon: Mic,
    title: 'Клон голоса',
    description: 'Озвучка своим голосом',
  },
  {
    icon: Star,
    title: 'Без подписки',
    description: 'Платите только за генерации',
  },
];

const USE_CASES = [
  'Музыка для видео',
  'Подкасты и озвучка',
  'Рекламные ролики',
  'Каверы на песни',
  'Аудиокниги',
  'Контент для TikTok',
];

export default function AudioPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 text-pink-400 text-sm mb-6">
            <Music className="w-4 h-4" />
            AI Музыка и Голос
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] mb-6 leading-tight">
            Генерация музыки и голоса с ИИ
          </h1>
          
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Создавайте полноценные треки, клонируйте голос и озвучивайте тексты. 
            Suno AI для музыки, ElevenLabs-качество для речи.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create?section=audio"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Headphones className="w-5 h-5" />
              Создать аудио
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--surface)] hover:bg-[var(--surface2)] text-[var(--text)] font-semibold rounded-xl transition-all"
            >
              Тарифы
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-12">
            Почему выбирают LensRoom для аудио
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
                <feature.icon className="w-10 h-10 text-pink-500 mx-auto mb-4" />
                <h3 className="font-semibold text-[var(--text)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audio Features */}
      <section className="py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-4">
            Возможности аудио-генератора
          </h2>
          <p className="text-[var(--muted)] text-center mb-12">
            Музыка, голос, каверы — всё в одном месте
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {AUDIO_FEATURES.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-pink-500/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-[var(--text)]">{feature.name}</h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-pink-500/10 text-pink-400">
                    {feature.badge}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mb-4">{feature.description}</p>
                <div className="text-lg font-semibold text-[var(--accent-primary)]">{feature.price}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              href="/create?section=audio"
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl transition-all"
            >
              Начать генерацию
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-12">
            Для чего используют AI-генерацию аудио
          </h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            {USE_CASES.map((useCase, i) => (
              <div
                key={i}
                className="px-6 py-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
              >
                {useCase}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-12">
            Как создать музыку или озвучку с ИИ
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Выберите режим</h3>
              <p className="text-sm text-[var(--muted)]">Музыка, речь или клонирование голоса</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Опишите или загрузите</h3>
              <p className="text-sm text-[var(--muted)]">Текст для озвучки, описание трека или образец голоса</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Скачайте результат</h3>
              <p className="text-sm text-[var(--muted)]">Получите готовый аудиофайл в высоком качестве</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-pink-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовы создать своё первое аудио?
          </h2>
          <p className="text-white/80 mb-8">
            Присоединяйтесь к тысячам создателей контента
          </p>
          <Link
            href="/create?section=audio"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
          >
            <Wand2 className="w-5 h-5" />
            Начать бесплатно
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
