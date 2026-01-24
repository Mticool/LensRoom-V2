'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate options array from min to max
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[80px]
          ${disabled
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
          }
        `}
        title="Количество"
      >
        <span className="text-sm font-medium font-mono">{value}/{max}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu - opens upward */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg shadow-xl overflow-hidden z-[70] min-w-[80px]">
          {options.map((num) => (
            <button
              key={num}
              onClick={() => {
                onChange(num);
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2.5 text-sm font-medium font-mono text-center transition-colors
                ${num === value
                  ? 'bg-[#CDFF00]/10 text-[#CDFF00]'
                  : 'text-white hover:bg-[#2A2A2C]'
                }
              `}
            >
              {num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
