import { Metadata } from 'next';
import Link from 'next/link';
import { ImageIcon, Sparkles, Zap, Star, ArrowRight, Palette } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Нейросети для генерации изображений онлайн',
  description: 'Создавайте профессиональные изображения и фотографии по тексту.',
  keywords: [
    'создание изображений ИИ',
    'генерация изображений нейросеть',
    'AI генератор картинок',
    'изображение по тексту',
    'нейросеть для изображений',
    'flux 2',
    'gpt image',
    'создать картинку онлайн',
    'генератор изображений бесплатно',
    'нарисовать картинку нейросеть',
  ],
  openGraph: {
    title: 'Нейросети для генерации изображений онлайн',
    description: 'Создавайте профессиональные изображения и фотографии по тексту.',
    url: 'https://lensroom.ru/image',
    type: 'website',
  },
  alternates: {
    canonical: '/image',
  },
};

const IMAGE_MODELS = [
  {
    name: 'Nano Banana Pro',
    badge: 'Быстрый',
    description: 'Мгновенная генерация изображений',
    price: '7⭐',
  },
  {
    name: 'FLUX.2 Pro',
    badge: 'Популярный',
    description: 'Высококачественные фотореалистичные изображения',
    price: '15⭐',
  },
  {
    name: 'Midjourney V7',
    badge: 'Премиум',
    description: 'Художественный стиль, детализация',
    price: '25⭐',
  },
  {
    name: 'GPT Image',
    badge: 'OpenAI',
    description: 'Умная генерация с пониманием контекста',
    price: '20⭐',
  },
  {
    name: 'Grok Imagine',
    badge: 'xAI',
    description: 'Креативные и уникальные изображения',
    price: '10⭐',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Мгновенный результат',
    description: 'Изображение за 5-30 секунд',
  },
  {
    icon: Sparkles,
    title: '6+ AI моделей',
    description: 'Flux, Midjourney, GPT и другие',
  },
  {
    icon: Palette,
    title: '4K качество',
    description: 'Высокое разрешение до 4096px',
  },
  {
    icon: Star,
    title: 'От 7⭐ за картинку',
    description: 'Доступные цены',
  },
];

const USE_CASES = [
  'Иллюстрации для блога',
  'Контент для соцсетей',
  'Рекламные креативы',
  'Продуктовые фото',
  'Аватарки и портреты',
  'Арт и концепты',
];

export default function ImagePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-sm mb-6">
            <ImageIcon className="w-4 h-4" />
            AI Генератор изображений
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] mb-6 leading-tight">
            Создание изображений с помощью ИИ
          </h1>
          
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Создавайте профессиональные изображения и фотографии по текстовому описанию. 
            Flux.2, Midjourney, GPT Image — все топовые нейросети в одном месте.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generator?section=image"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Palette className="w-5 h-5" />
              Создать изображение
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
            Почему выбирают LensRoom для создания изображений
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center">
                <feature.icon className="w-10 h-10 text-blue-500 mx-auto mb-4" />
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
            Доступные нейросети для генерации изображений
          </h2>
          <p className="text-[var(--muted)] text-center mb-12">
            Выбирайте лучшую модель под вашу задачу
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {IMAGE_MODELS.map((model, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-blue-500/50 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-[var(--text)]">{model.name}</h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400">
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
              href="/generator?section=image"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
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
            Для чего используют AI-генерацию изображений
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
            Как создать изображение с ИИ
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Опишите картинку</h3>
              <p className="text-sm text-[var(--muted)]">Напишите что хотите увидеть на русском или английском</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Выберите модель</h3>
              <p className="text-sm text-[var(--muted)]">Flux для фото, Midjourney для арта, GPT для умных картинок</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-[var(--text)] mb-2">Скачайте результат</h3>
              <p className="text-sm text-[var(--muted)]">Получите изображение в высоком качестве</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Готовы создать своё первое изображение?
          </h2>
          <p className="text-white/80 mb-8">
            Присоединяйтесь к тысячам дизайнеров и маркетологов
          </p>
          <Link
            href="/generator?section=image"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-100 transition-all"
          >
            Начать бесплатно
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
