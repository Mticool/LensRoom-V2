import { Metadata } from 'next';
import { VideoGeneratorHiggsfield } from '@/components/video/VideoGeneratorHiggsfield';

export const metadata: Metadata = {
  title: 'Видео-генератор (Higgsfield Style) | LensRoom',
  description: 'Создавай профессиональные видеоролики с новым интерфейсом в стиле Higgsfield.',
};

export default function HiggsfieldVideoPage() {
  return <VideoGeneratorHiggsfield />;
}
