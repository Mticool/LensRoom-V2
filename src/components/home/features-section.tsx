'use client';

import { Card } from '@/components/ui/card';
import { Image, Video, Package, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Image,
    title: 'AI Фото',
    description: '6 моделей для фотореалистичных изображений',
  },
  {
    icon: Video,
    title: 'AI Видео',
    description: 'Создавайте профессиональные видео из текста',
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
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Всё для создания контента
          </h2>
          <p className="text-muted-foreground text-lg">
            Простой интерфейс, мощные возможности
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card variant="hover" className="p-6 h-full">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
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
