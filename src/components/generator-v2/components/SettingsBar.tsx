'use client';

import { Minus, Plus } from 'lucide-react';

interface SettingsBarProps {
  variants: number;
  aspectRatio: string;
  quality: string;
  onVariantsChange: (n: number) => void;
  onAspectChange: (a: string) => void;
  onQualityChange: (q: string) => void;
  disabled?: boolean;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const QUALITIES = [
  { value: '1K', label: '1K (Fast)', stars: 30 },
  { value: '2K', label: '2K (Balanced)', stars: 30 },
  { value: '4K', label: '4K (Quality)', stars: 40 },
];

export function SettingsBar({
  variants,
  aspectRatio,
  quality,
  onVariantsChange,
  onAspectChange,
  onQualityChange,
  disabled = false,
}: SettingsBarProps) {
  return (
    <div className="flex-shrink-0 border-t border-[#27272A] bg-[#0A0A0A] px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-6">
        {/* Variants Counter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#A1A1AA]">Variants:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onVariantsChange(Math.max(1, variants - 1))}
              disabled={disabled || variants <= 1}
              className="p-1.5 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white font-medium w-8 text-center">{variants}</span>
            <button
              onClick={() => onVariantsChange(Math.min(4, variants + 1))}
              disabled={disabled || variants >= 4}
              className="p-1.5 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#A1A1AA]">Aspect:</span>
          <select
            value={aspectRatio}
            onChange={(e) => onAspectChange(e.target.value)}
            disabled={disabled}
            className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {ar.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quality */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#A1A1AA]">Quality:</span>
          <select
            value={quality}
            onChange={(e) => onQualityChange(e.target.value)}
            disabled={disabled}
            className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {QUALITIES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label} ({q.stars} ⭐)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
