'use client';

import { useMemo } from 'react';
import { ImageGalleryMasonry } from '@/components/generator-v2/ImageGalleryMasonry';
import type { GenerationResult } from '@/components/generator-v2/GeneratorV2';

export default function TestMinimalPage() {
  const images = useMemo<GenerationResult[]>(() => {
    const now = Date.now();
    const mk = (id: string, size: string, url: string, prompt: string): GenerationResult => ({
      id,
      status: 'success',
      url,
      previewUrl: url,
      prompt,
      mode: 'image',
      timestamp: now,
      settings: {
        model: 'nano-banana-pro',
        size,
        quality: '1k_2k',
        outputFormat: 'png',
      },
    });

    return [
      mk('demo-1x1-a', '1:1', '/showcase/aspect-1x1.png', 'Demo 1:1'),
      mk('demo-19x6-a', '19:6', '/showcase/aspect-19x6.png', 'Demo 19:6'),
      mk('demo-1x1-b', '1:1', '/showcase/1.jpg', 'Square sample'),
      mk('demo-19x6-b', '19:6', '/showcase/aspect-19x6.png', 'Ultra-wide sample'),
      mk('demo-1x1-c', '1:1', '/showcase/2.jpg', 'Square sample'),
      mk('demo-19x6-c', '19:6', '/showcase/aspect-19x6.png', 'Ultra-wide sample'),
    ];
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <div className="px-4 pt-6 pb-3">
        <div className="text-sm font-semibold text-white/80">Gallery Demo (Mobile)</div>
        <div className="mt-1 text-xs text-white/50">Includes 1:1 and 19:6 tiles.</div>
      </div>

      <div className="px-3 pb-10">
        <ImageGalleryMasonry
          images={images}
          isGenerating={false}
          layout="grid"
          fullWidth
          showLabel={false}
        />
      </div>
    </div>
  );
}
