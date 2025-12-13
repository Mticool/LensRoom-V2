'use client';

import { Card } from '@/components/ui/card';
import { Image, Video, Package, Zap, Sparkles, Layers, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Image,
    title: 'AI Фото',
    description: 'Фотореалистичные изображения с помощью 6 топовых моделей',
  },
  {
    icon: Video,
    title: 'AI Видео',
    description: 'Создавайте видео из текста или изображений',
  },
  {
    icon: Package,
    title: 'Продукты',
    description: 'Batch обработка для маркетплейсов',
  },
  {
    icon: Zap,
    title: 'Быстро',
    description: 'Результат менее чем за 30 секунд',
  },
  {
    icon: Sparkles,
    title: 'Качество',
    description: 'Лучшие модели: Flux, SDXL, Midjourney',
  },
  {
    icon: Layers,
    title: 'Гибкость',
    description: 'Настраивайте размер, стиль и параметры',
  },
  {
    icon: Shield,
    title: 'Приватность',
    description: 'Ваши данные защищены и не передаются',
  },
  {
    icon: Clock,
    title: 'История',
    description: 'Сохраняйте и находите все генерации',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-[var(--color-bg-secondary)]/50">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            Всё для создания контента
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
            Простой интерфейс, мощные возможности. 
            Всё что нужно для работы с AI-генерацией.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card variant="hover" padding="md" className="h-full">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-purple-500)]/20 to-[var(--color-blue-500)]/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[var(--color-purple-400)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
