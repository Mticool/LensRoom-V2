'use client';

import { motion } from 'framer-motion';
import { Image, Video, Package, Zap, Sparkles, Shield } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Image,
    title: 'AI Фото',
    description: '6 моделей от Flux.2 до Seedream 4.5. Фотореалистичные результаты за секунды.',
    link: '/create',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Video,
    title: 'AI Видео',
    description: 'Sora 2 Pro, Kling 2.6, Veo 3.1 — создавайте профессиональные видео из текста.',
    link: '/create/video',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Package,
    title: 'Продуктовые карточки',
    description: 'Batch обработка для маркетплейсов. WB, Ozon, Яндекс.Маркет — идеальные фото.',
    link: '/create/products',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Zap,
    title: 'Молниеносно',
    description: 'Среднее время генерации — менее 30 секунд. Без очередей на Pro плане.',
    link: '/pricing',
    gradient: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Sparkles,
    title: 'Библиотека промптов',
    description: '500+ готовых промптов. Копируйте и используйте лучшие практики.',
    link: '/library',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Shield,
    title: 'Безопасно',
    description: 'Ваши данные защищены. GDPR compliant. Никаких watermark на Pro.',
    link: '/pricing',
    gradient: 'from-indigo-500 to-blue-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-[var(--color-bg-secondary)] section-padding">
      <div className="container-apple">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-headline mb-4"
          >
            Всё, что нужно для{' '}
            <span className="gradient-text">создания контента</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-body-large max-w-2xl mx-auto"
          >
            От идеи до результата за минуты. Простой интерфейс, мощные возможности.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={feature.link}>
                  <div className="card-dark h-full group cursor-pointer p-6 hover:translate-y-[-4px] hover:border-[var(--color-border-strong)]">
                    {/* Icon with gradient */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} 
                                    flex items-center justify-center mb-5
                                    group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-purple-400)] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="inline-flex items-center text-[var(--color-purple-400)] font-medium 
                                    group-hover:gap-2 transition-all">
                      Узнать больше
                      <svg 
                        className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
