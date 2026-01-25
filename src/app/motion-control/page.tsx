import { Metadata } from 'next';
import { redirect } from 'next/navigation';

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

export default function MotionControlPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const params = new URLSearchParams();
  params.set("section", "motion");
  params.set("model", "kling-motion-control");

  const project = String(get("project") || get("thread") || "").trim();
  if (project) params.set("project", project);

  redirect(`/create/studio?${params.toString()}`);
}
