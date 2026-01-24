import { Suspense } from 'react';
import { Metadata } from 'next';
import { VideoGeneratorPage } from '@/components/video-generator/VideoGeneratorPage';

export const metadata: Metadata = {
  title: 'Видео-генератор | LensRoom',
  description: 'Создавай видео из текста, картинок и motion-референсов с помощью лучших AI моделей: Veo, Sora, Kling и других.',
  openGraph: {
    title: 'Видео-генератор | LensRoom',
    description: 'Создавай видео из текста, картинок и motion-референсов',
  },
};

export default function GeneratorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] pt-24">
          <div className="container mx-auto px-6 py-10">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Загрузка…
            </div>
          </div>
        </div>
      }
    >
      <VideoGeneratorPage />
    </Suspense>
  );
}
