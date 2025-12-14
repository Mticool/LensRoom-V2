'use client';

import { Video, MoveLeft, MoveRight, ZoomIn, ZoomOut, RotateCcw, Camera } from 'lucide-react';
import { useState } from 'react';

interface CameraControlProps {
  onCameraChange: (settings: CameraSettings) => void;
}

interface CameraSettings {
  movement: 'static' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'orbit';
  speed: number;
}

export function CameraControl({ onCameraChange }: CameraControlProps) {
  const [movement, setMovement] = useState<CameraSettings['movement']>('static');
  const [speed, setSpeed] = useState(50);

  const movements = [
    { value: 'static', label: 'Статика', icon: Camera },
    { value: 'pan-left', label: 'Влево', icon: MoveLeft },
    { value: 'pan-right', label: 'Вправо', icon: MoveRight },
    { value: 'zoom-in', label: 'Наезд', icon: ZoomIn },
    { value: 'zoom-out', label: 'Отъезд', icon: ZoomOut },
    { value: 'orbit', label: 'Орбита', icon: RotateCcw },
  ] as const;

  const handleChange = (newMovement: CameraSettings['movement']) => {
    setMovement(newMovement);
    onCameraChange({ movement: newMovement, speed });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2">
        <Video className="w-4 h-4 text-[#c8ff00]" />
        Движение камеры
      </label>

      <div className="flex flex-wrap gap-2">
        {movements.map((move) => {
          const Icon = move.icon;
          return (
            <button
              key={move.value}
              type="button"
              onClick={() => handleChange(move.value)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all
                ${movement === move.value
                  ? 'border-[#c8ff00]/50 bg-[#c8ff00]/10 text-[#c8ff00]'
                  : 'border-white/10 hover:border-white/20 text-white/50 hover:text-white'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {move.label}
            </button>
          );
        })}
      </div>

      {/* Speed slider */}
      {movement !== 'static' && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-white/40">Скорость:</span>
          <input
            type="range"
            min="10"
            max="100"
            value={speed}
            onChange={(e) => {
              const newSpeed = Number(e.target.value);
              setSpeed(newSpeed);
              onCameraChange({ movement, speed: newSpeed });
            }}
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer 
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                       [&::-webkit-slider-thumb]:bg-[#c8ff00]"
          />
          <span className="text-xs text-white/40 w-8">{speed}%</span>
        </div>
      )}
    </div>
  );
}

