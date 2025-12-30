'use client';

import { HistorySidebar, type Generation } from '@/components/generator/HistorySidebar';

interface VideoHistorySidebarProps {
  generations: Generation[];
  onSelectGeneration: (generation: Generation) => void;
  onDeleteGeneration: (id: string) => void;
  selectedId?: string;
}

export function VideoHistorySidebar(props: VideoHistorySidebarProps) {
  return <HistorySidebar {...props} />;
}

