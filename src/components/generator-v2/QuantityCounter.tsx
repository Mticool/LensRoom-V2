'use client';

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
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  return (
    <div
      className={`
        flex items-center justify-between gap-2 px-2 py-2 rounded-lg border transition-colors min-w-[80px]
        ${disabled
          ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
          : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
        }
      `}
      title="Количество"
      aria-label="Количество"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={!canDecrement}
        className="w-7 h-7 rounded-md bg-white/10 text-white hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10"
        aria-label="Уменьшить количество"
      >
        −
      </button>

      <span className="text-sm font-semibold font-mono tabular-nums text-white">
        {value}/{max}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={!canIncrement}
        className="w-7 h-7 rounded-md bg-white/10 text-white hover:bg-[#f59e0b]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10"
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}
