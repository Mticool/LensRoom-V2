'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Image, Video, User, Camera, Clock } from 'lucide-react';

interface TipItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function TipItem({ icon: Icon, title, description }: TipItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface2)]">
      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-purple-400" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-[var(--text)]">{title}</h4>
        <p className="text-xs text-[var(--muted)] mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function MotionControlTips() {
  const [isExpanded, setIsExpanded] = useState(true);

  const tips = [
    {
      icon: Image,
      title: 'Совмещайте кадрирование',
      description: 'Если на фото полное тело — используйте видео с полным телом. Если половина корпуса — такое же по плану видео.',
    },
    {
      icon: Video,
      title: 'Выбирайте плавное движение',
      description: 'Используйте видео с чистым, естественным движением. Избегайте слишком резких и быстрых действий.',
    },
    {
      icon: User,
      title: 'Оставьте пространство для жестов',
      description: 'Убедитесь, что на изображении достаточно пространства вокруг персонажа для больших жестов и движений.',
    },
    {
      icon: Camera,
      title: 'Один персонаж в кадре',
      description: 'На изображении персонаж должен быть хорошо виден, без сильных перекрытий. Один главный персонаж.',
    },
    {
      icon: Clock,
      title: 'Без резких склеек',
      description: 'На видео старайтесь использовать одного персонажа, без резких смен камеры, зума и склеек. 3–30 сек.',
    },
  ];

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-medium text-[var(--text)]">Лучшие практики</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {tips.map((tip, index) => (
            <TipItem key={index} icon={tip.icon} title={tip.title} description={tip.description} />
          ))}
          
          {/* Additional info */}
          <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-blue-400">
              <strong>Совет:</strong> Для лучших результатов используйте изображение и видео с похожими условиями освещения и углом камеры.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
