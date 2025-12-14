'use client';

import { Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NegativePromptProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const PRESET_NEGATIVES = [
  { label: 'Размытие', value: 'blurry, out of focus' },
  { label: 'Деформации', value: 'deformed, distorted, disfigured' },
  { label: 'Низкое качество', value: 'low quality, low resolution, pixelated' },
  { label: 'Текст/водяные знаки', value: 'text, watermark, signature, logo' },
  { label: 'Плохая анатомия', value: 'bad anatomy, extra limbs, missing limbs' },
  { label: 'Артефакты', value: 'artifacts, noise, grain, jpeg artifacts' },
];

export function NegativePrompt({ 
  value, 
  onChange,
  placeholder = 'Что НЕ должно быть на изображении...'
}: NegativePromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const addPreset = (presetValue: string) => {
    const current = value.trim();
    const newValue = current 
      ? `${current}, ${presetValue}` 
      : presetValue;
    onChange(newValue);
  };

  const isPresetActive = (presetValue: string) => {
    return value.toLowerCase().includes(presetValue.toLowerCase());
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <label className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer">
          <Ban className="w-4 h-4" />
          Негативный промпт
        </label>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-muted-foreground">
            Укажите, что исключить из генерации
          </p>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full min-h-[80px] p-3 text-sm rounded-lg resize-none',
              'bg-secondary border border-border',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
            )}
          />

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Быстрые теги:</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_NEGATIVES.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={isPresetActive(preset.value) ? 'default' : 'outline'}
                  className="text-xs h-7"
                  onClick={() => addPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onChange('')}
            >
              Очистить всё
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

