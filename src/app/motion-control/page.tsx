import { Metadata } from 'next';
import { MotionControlGenerator } from '@/components/motion-control/MotionControlGenerator';

export const metadata: Metadata = {
  title: 'Kling 2.6 Motion Control — Перенос движений на персонажа',
  description: 'Перенесите движение, жесты и мимику из референс-видео на персонажа с изображения. Image-to-video модель Kling 2.6 Motion Control от Kie.ai.',
  keywords: [
    'motion control',
    'kling motion control',
    'перенос движений',
    'анимация персонажа',
    'image to video',
    'AI анимация',
    'kling 2.6',
    'танцующий персонаж AI',
    'нейросеть для анимации',
    'генератор движений',
    'motion transfer',
    'kie.ai',
  ],
  openGraph: {
    title: 'Kling 2.6 Motion Control — Перенос движений на персонажа',
    description: 'Перенесите движение, жесты и мимику из референс-видео на персонажа с изображения.',
    url: 'https://lensroom.ru/motion-control',
    type: 'website',
  },
  alternates: {
    canonical: '/motion-control',
  },
};

export default function MotionControlPage() {
  return <MotionControlGenerator />;
}
