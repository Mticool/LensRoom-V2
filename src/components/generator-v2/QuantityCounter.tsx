'use client';

import { Minus, Plus } from 'lucide-react';

interface QuantityCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityCounter({ 
  value, 
  onChange, 
  min = 1, 
  max = 4,
  disabled 
}: QuantityCounterProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  const handleDecrement = () => {
    if (canDecrement && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (canIncrement && !disabled) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrement}
        disabled={disabled || !canDecrement}
        className={`
          w-8 h-8 flex items-center justify-center rounded-lg border transition-colors
          ${disabled || !canDecrement
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
          }
        `}
        title="Уменьшить"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="w-12 text-center">
        <span className="text-sm font-mono font-medium text-white">
          {value}/{max}
        </span>
      </div>

      <button
        onClick={handleIncrement}
        disabled={disabled || !canIncrement}
        className={`
          w-8 h-8 flex items-center justify-center rounded-lg border transition-colors
          ${disabled || !canIncrement
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
          }
        `}
        title="Увеличить"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
