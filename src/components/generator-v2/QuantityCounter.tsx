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
        flex items-center justify-between gap-2 px-2 py-1.5 rounded-full transition-colors min-w-[80px]
        ${disabled
          ? 'bg-white/3 text-white/30 cursor-not-allowed'
          : 'bg-white/5 text-white'
        }
      `}
      title="Количество"
      aria-label="Количество"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={!canDecrement}
        className="w-6 h-6 rounded-full bg-white/8 text-white/80 text-xs hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/8 flex items-center justify-center"
        aria-label="Уменьшить количество"
      >
        −
      </button>

      <span className="text-[11px] font-semibold tabular-nums text-white/80">
        {value}/{max}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={!canIncrement}
        className="w-6 h-6 rounded-full bg-white/8 text-white/80 text-xs hover:bg-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/8 flex items-center justify-center"
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}
