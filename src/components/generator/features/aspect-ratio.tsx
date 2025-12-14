'use client';

import { RectangleHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AspectRatioValue = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '4:5' | '2:3' | '3:2';

interface AspectRatioProps {
  value: AspectRatioValue;
  onChange: (value: AspectRatioValue) => void;
  availableRatios?: AspectRatioValue[];
}

const ASPECT_RATIO_CONFIG: Record<AspectRatioValue, { label: string; icon: string; desc: string }> = {
  '1:1': { label: '1:1', icon: '□', desc: 'Квадрат' },
  '16:9': { label: '16:9', icon: '▬', desc: 'Горизонтальное' },
  '9:16': { label: '9:16', icon: '▮', desc: 'Вертикальное' },
  '4:3': { label: '4:3', icon: '▭', desc: 'Классическое' },
  '3:4': { label: '3:4', icon: '▯', desc: 'Портрет' },
  '4:5': { label: '4:5', icon: '▯', desc: 'Instagram' },
  '2:3': { label: '2:3', icon: '▯', desc: 'Фото' },
  '3:2': { label: '3:2', icon: '▭', desc: 'Пейзаж' },
};

const DEFAULT_RATIOS: AspectRatioValue[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export function AspectRatio({ 
  value, 
  onChange, 
  availableRatios = DEFAULT_RATIOS 
}: AspectRatioProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <RectangleHorizontal className="w-4 h-4" />
        Соотношение сторон
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {availableRatios.map((ratio) => {
          const config = ASPECT_RATIO_CONFIG[ratio];
          const isSelected = value === ratio;
          
          return (
            <Button
              key={ratio}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'flex flex-col h-auto py-3 px-2 gap-1',
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={() => onChange(ratio)}
            >
              <AspectRatioPreview ratio={ratio} isSelected={isSelected} />
              <span className="text-xs font-medium">{config.label}</span>
              <span className="text-[10px] text-muted-foreground">{config.desc}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function AspectRatioPreview({ ratio, isSelected }: { ratio: AspectRatioValue; isSelected: boolean }) {
  const getPreviewSize = () => {
    switch (ratio) {
      case '1:1': return { width: 24, height: 24 };
      case '16:9': return { width: 32, height: 18 };
      case '9:16': return { width: 18, height: 32 };
      case '4:3': return { width: 28, height: 21 };
      case '3:4': return { width: 21, height: 28 };
      case '4:5': return { width: 20, height: 25 };
      case '2:3': return { width: 18, height: 27 };
      case '3:2': return { width: 27, height: 18 };
      default: return { width: 24, height: 24 };
    }
  };

  const size = getPreviewSize();

  return (
    <div 
      className={cn(
        'border-2 rounded-sm transition-colors',
        isSelected ? 'border-primary-foreground' : 'border-muted-foreground'
      )}
      style={{ width: size.width, height: size.height }}
    />
  );
}

