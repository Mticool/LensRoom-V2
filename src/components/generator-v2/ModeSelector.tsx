'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Smile, Flame } from 'lucide-react';

interface ModeOption {
  value: string;
  label: string;
  icon: typeof Sparkles;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: 'normal', label: 'Обычный', icon: Sparkles },
  { value: 'fun', label: 'Креатив', icon: Smile },
  { value: 'spicy', label: 'Смелый 🌶️', icon: Flame },
];

interface ModeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = MODE_OPTIONS.find(m => m.value === value) || MODE_OPTIONS[0];
  const SelectedIcon = selectedOption.icon;

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
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${disabled 
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed' 
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C]'
          }
        `}
      >
        <SelectedIcon className="w-4 h-4" />
        <span className="text-sm font-medium">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-32 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg shadow-xl overflow-hidden z-50">
          {MODE_OPTIONS.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                onClick={() => {
                  onChange(mode.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2.5 text-left transition-colors flex items-center gap-2 justify-center
                  ${mode.value === value 
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b]' 
                    : 'text-white hover:bg-[#2A2A2C]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{mode.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
