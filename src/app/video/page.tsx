import { Metadata } from 'next';
import Link from 'next/link';
import { Video, Sparkles, Zap, Star, ArrowRight, Play } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Нейросети для генерации видео онлайн',
  description: 'Создавай профессиональные видеоролики реалистичные видео по тексту и изображениям.',
  keywords: [
    'создание видео ИИ',
    'генерация видео нейросеть',
    'AI видео генератор',
    'видео по тексту',
    'нейросеть для видео',
    'veo 3.1',
    'sora 2',
    'kling ai',
    'создать видео онлайн',
    'генератор видео бесплатно',
  ],
  openGraph: {
    title: 'Нейросети для генерации видео онлайн',
    description: 'Создавай профессиональные видеоролики реалистичные видео по тексту и изображениям.',
    url: 'https://lensroom.ru/video',
    type: 'website',
  },
  alternates: {
    canonical: '/video',
  },
};

const VIDEO_MODELS = [
  {
    name: 'Veo 3.1',
    badge: 'Google',
    description: 'Реалистичные видео до 8 секунд в качестве 1080p',
    price: 'от 99⭐',
  },
  {
    name: 'Sora 2 Pro',
    badge: 'OpenAI',
    description: 'Кинематографичные видео 10-15 секунд',
    price: 'от 250⭐',
  },
  {
    name: 'Kling 2.6',
    badge: 'Trending',
    description: 'Видео с аудио, Turbo и Pro режимы',
    price: 'от 105⭐',
  },
  {
    name: 'WAN AI',
    badge: 'Новинка',
    description: 'Быстрая генерация 5-15 секунд',
    price: 'от 100⭐',
  },
  {
    name: 'Grok Video',
    badge: 'xAI',
    description: 'Text-to-Video + Image-to-Video',
    price: '25⭐',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Быстрая генерация',
    description: 'Получите видео за 30-120 секунд',
  },
  {
    icon: Sparkles,
    title: '5+ AI моделей',
    description: 'Veo, Sora, Kling, WAN и другие',
  },
  {
    icon: Video,
    title: 'HD качество',
    description: 'До 1080p разрешение',
  },
  {
    icon: Star,
    title: 'Без подписки',
    description: 'Платите только за генерации',
  },
];

export default function VideoPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 text-sm mb-6">
            <Video className="w-4 h-4" />
            AI Видео Генератор
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] mb-6 leading-tight">
            Создание видео с помощью ИИ
          </h1>
          
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Генерируйте профессиональные видеоролики по текстовому описанию или изображению. 
            Топовые нейросети Veo 3.1, Sora 2, Kling в одном месте.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generators"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Play className="w-5 h-5" />
              Создать видео
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
            Почему выбирают LensRoom для создания видео
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
                <feature.icon className="w-10 h-10 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold text-[var(--text)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-16 px-4 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-4">
            Доступные нейросети для генерации видео
          </h2>
          <p className="text-[var(--muted)] text-center mb-12">
            Выбирайте лучшую модель под вашу задачу
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIDEO_MODELS.map((model, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-purple-500/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-[var(--text)]">{model.name}</h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400">
                    {model.badge}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mb-4">{model.description}</p>
                <div className="text-lg font-semibold text-[var(--accent-primary)]">{model.price}</div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              href="/generators"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
            >
              Начать генерацию
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-12">
            Как создать видео с ИИ
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Опишите идею</h3>
              <p className="text-sm text-[var(--muted)]">Напишите текстовое описание или загрузите изображение</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Выберите модель</h3>
              <p className="text-sm text-[var(--muted)]">Veo для реализма, Sora для кино, Kling для скорости</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Получите видео</h3>
              <p className="text-sm text-[var(--muted)]">Скачайте готовое видео в HD качестве</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовы создать своё первое видео?
          </h2>
          <p className="text-white/80 mb-8">
            Присоединяйтесь к тысячам создателей контента
          </p>
          <Link
            href="/generators"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
          >
            Начать бесплатно
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}

