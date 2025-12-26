'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  ImageOff, VideoOff, FolderOpen, Search, Star, History, 
  Sparkles, Package, FileQuestion, Inbox
} from 'lucide-react';
import { Button } from './button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--muted)] max-w-sm mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button asChild className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button 
            onClick={action.onClick}
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
          >
            {action.label}
          </Button>
        )
      )}
    </motion.div>
  );
}

// Preset empty states
export function NoGenerationsEmpty({ onGenerate }: { onGenerate?: () => void }) {
  return (
    <EmptyState
      icon={<Sparkles className="w-8 h-8 text-[var(--gold)]" />}
      title="Пока нет генераций"
      description="Создайте свой первый контент с помощью AI"
      action={onGenerate ? { label: 'Создать', onClick: onGenerate } : { label: 'Создать', href: '/create' }}
    />
  );
}

export function NoHistoryEmpty() {
  return (
    <EmptyState
      icon={<History className="w-8 h-8 text-[var(--muted)]" />}
      title="История пуста"
      description="Здесь появятся ваши недавние генерации"
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8 text-[var(--muted)]" />}
      title="Ничего не найдено"
      description={query ? `По запросу "${query}" ничего не найдено` : 'Попробуйте изменить параметры поиска'}
    />
  );
}

export function NoFavoritesEmpty() {
  return (
    <EmptyState
      icon={<Star className="w-8 h-8 text-[var(--gold)]" />}
      title="Нет избранного"
      description="Добавляйте понравившиеся генерации в избранное"
    />
  );
}

export function NoImagesEmpty() {
  return (
    <EmptyState
      icon={<ImageOff className="w-8 h-8 text-[var(--muted)]" />}
      title="Нет изображений"
      description="Загрузите изображение или создайте новое"
      action={{ label: 'Создать фото', href: '/create' }}
    />
  );
}

export function NoVideosEmpty() {
  return (
    <EmptyState
      icon={<VideoOff className="w-8 h-8 text-[var(--muted)]" />}
      title="Нет видео"
      description="Создайте своё первое AI видео"
      action={{ label: 'Создать видео', href: '/create/video' }}
    />
  );
}

export function NoProductsEmpty() {
  return (
    <EmptyState
      icon={<Package className="w-8 h-8 text-[var(--muted)]" />}
      title="Нет товаров"
      description="Создайте продуктовые изображения с AI"
      action={{ label: 'E-Com Studio', href: '/create/products' }}
    />
  );
}

export function EmptyFolder() {
  return (
    <EmptyState
      icon={<FolderOpen className="w-8 h-8 text-[var(--muted)]" />}
      title="Папка пуста"
      description="Добавьте файлы в эту папку"
    />
  );
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={<Inbox className="w-8 h-8 text-[var(--muted)]" />}
      title="Нет данных"
      description="Данные появятся здесь позже"
    />
  );
}

export function ErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<FileQuestion className="w-8 h-8 text-red-400" />}
      title="Что-то пошло не так"
      description="Не удалось загрузить данные"
      action={onRetry ? { label: 'Попробовать снова', onClick: onRetry } : undefined}
    />
  );
}

