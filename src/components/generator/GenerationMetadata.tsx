'use client';

import { Clock, Zap } from 'lucide-react';
import type { Generation } from './HistorySidebar';

interface GenerationMetadataProps {
  generation: Generation;
}

export function GenerationMetadata({ generation }: GenerationMetadataProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4" />
        <span>{generation.duration || 'N/A'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4" />
        <span>{generation.cost} credits</span>
      </div>
      <div className="flex-1" />
      <span className="text-[var(--text)] font-medium">{generation.model}</span>
    </div>
  );
}








