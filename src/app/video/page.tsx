import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Видео-генератор | LensRoom',
  description: 'Создавай профессиональные видеоролики и реалистичные видео по тексту и изображениям с помощью AI.',
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
  ],
  openGraph: {
    title: 'Видео-генератор | LensRoom',
    description: 'Создавай видео из текста, картинок и motion-референсов',
    url: 'https://lensroom.ru/video',
    type: 'website',
  },
  alternates: {
    canonical: '/generators',
  },
};

export default function VideoPage() {
  redirect('/generators');
}
