'use client';

import { RectangleHorizontal } from 'lucide-react';

interface AspectRatioSelectorProps {
  ratios: string[];
  selected: string;
  onChange: (ratio: string) => void;
}

export function AspectRatioSelector({ ratios, selected, onChange }: AspectRatioSelectorProps) {
  const getRatioIcon = (ratio: string) => {
    const [w, h] = ratio.split(':').map(Number);
    const isVertical = h > w;
    const isSquare = w === h;
    
    // Return visual ratio indicator
    if (isSquare) return { width: 16, height: 16 };
    if (isVertical) return { width: 12, height: 16 };
    return { width: 16, height: 10 };
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2">
        <RectangleHorizontal className="w-4 h-4 text-[#c8ff00]" />
        Соотношение сторон
      </label>

      <div className="flex flex-wrap gap-2">
        {ratios.map((ratio) => {
          const size = getRatioIcon(ratio);
          return (
            <button
              key={ratio}
              type="button"
              onClick={() => onChange(ratio)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                ${selected === ratio
                  ? 'border-[#c8ff00]/50 bg-[#c8ff00]/10 text-[#c8ff00]'
                  : 'border-white/10 hover:border-white/20 text-white/50 hover:text-white'
                }
              `}
            >
              <div 
                className={`rounded-sm ${selected === ratio ? 'bg-[#c8ff00]' : 'bg-white/30'}`}
                style={{ width: size.width, height: size.height }}
              />
              {ratio}
            </button>
          );
        })}
      </div>
    </div>
  );
}

