'use client';

import { Move, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface MotionBrushProps {
  onMotionChange: (areas: MotionArea[]) => void;
}

interface MotionArea {
  id: string;
  direction: 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out';
  intensity: number;
}

export function MotionBrush({ onMotionChange }: MotionBrushProps) {
  const [selectedDirection, setSelectedDirection] = useState<MotionArea['direction']>('right');
  const [intensity, setIntensity] = useState(50);

  const directions = [
    { value: 'up', label: 'Вверх', icon: ArrowUp },
    { value: 'down', label: 'Вниз', icon: ArrowDown },
    { value: 'left', label: 'Влево', icon: ArrowLeft },
    { value: 'right', label: 'Вправо', icon: ArrowRight },
    { value: 'zoom-in', label: 'Ближе', icon: ZoomIn },
    { value: 'zoom-out', label: 'Дальше', icon: ZoomOut },
  ] as const;

  const handleChange = (dir: MotionArea['direction']) => {
    setSelectedDirection(dir);
    onMotionChange([{ id: '1', direction: dir, intensity }]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Move className="w-4 h-4 text-[#c8ff00]" />
          Motion Brush
        </label>
        <p className="text-xs text-white/40 mt-1">
          Направление и сила движения
        </p>
      </div>

      {/* Direction Grid */}
      <div className="grid grid-cols-6 gap-2">
        {directions.map((dir) => {
          const Icon = dir.icon;
          return (
            <button
              key={dir.value}
              type="button"
              onClick={() => handleChange(dir.value)}
              className={`
                p-3 rounded-xl border transition-all text-center
                ${selectedDirection === dir.value
                  ? 'border-[#c8ff00]/50 bg-[#c8ff00]/10 text-[#c8ff00]'
                  : 'border-white/10 hover:border-white/20 text-white/50'
                }
              `}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <div className="text-[10px] font-medium">{dir.label}</div>
            </button>
          );
        })}
      </div>

      {/* Intensity Slider */}
      <div>
        <label className="text-xs text-white/40 mb-2 flex items-center justify-between">
          <span>Интенсивность</span>
          <span className="text-white font-medium">{intensity}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={(e) => {
            const val = Number(e.target.value);
            setIntensity(val);
            onMotionChange([{ id: '1', direction: selectedDirection, intensity: val }]);
          }}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer 
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:bg-violet-400"
        />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-white/5">
        <Zap className="w-4 h-4 text-[#c8ff00]" />
        <span className="text-white/50">
          Движение: <span className="text-white font-medium">
            {directions.find(d => d.value === selectedDirection)?.label}
          </span> ({intensity}%)
        </span>
      </div>
    </div>
  );
}

