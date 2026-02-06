'use client';

import dynamic from 'next/dynamic';
import { HomePageShell } from '@/components/home/HomePageShell';

/**
 * Главная: сначала показываем статичный hero (без framer-motion), тяжёлый контент — отдельным чанком.
 * Так первый кадр грузится сразу; если чанк 4aef... или motion не загрузится, пользователь уже видит hero и кнопки.
 */
const HomePageContent = dynamic(
  () => import('@/components/home/HomePageContent').then((m) => m.default),
  {
    loading: () => <HomePageShell />,
    ssr: false,
  }
);

export default function HomePage() {
  return <HomePageContent />;
}
