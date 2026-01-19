'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Gauge, Sparkles } from 'lucide-react';

interface QualityOption {
  value: string;
  label: string;
  desc: string;
  icon: typeof Zap;
}

const DEFAULT_QUALITY_OPTIONS: QualityOption[] = [
  { value: '1K', label: '1K', desc: '', icon: Gauge },
  { value: '2K', label: '2K', desc: '', icon: Sparkles },
  { value: '4K', label: '4K', desc: '', icon: Sparkles },
];

const ICON_MAP: Record<string, typeof Zap> = {
  'Turbo': Zap,
  'Balanced': Gauge,
  'Quality': Sparkles,
  'Быстро': Zap,
  'Баланс': Gauge,
  'Качество': Sparkles,
  '1K': Gauge,
  '2K': Sparkles,
  '4K': Sparkles,
  '8K': Sparkles,
  'Medium': Gauge,
  'High': Sparkles,
  'Стандарт': Gauge,
  'Премиум': Sparkles,
};

interface QualitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options?: string[]; // Custom quality options (e.g., ['Turbo', 'Balanced', 'Quality'])
}

export function QualitySelector({ value, onChange, disabled, options }: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build quality options from provided options array or use defaults
  const qualityOptions: QualityOption[] = options
    ? options.map(opt => ({
        value: opt,
        label: opt,
        desc: '',
        icon: ICON_MAP[opt] || Gauge,
      }))
    : DEFAULT_QUALITY_OPTIONS;

  const selectedOption = qualityOptions.find(q => q.value === value) || qualityOptions[0];
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
        <div className="absolute bottom-full left-0 mb-2 w-28 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg shadow-xl overflow-hidden z-50">
          {qualityOptions.map((quality) => {
            const Icon = quality.icon;
            return (
              <button
                key={quality.value}
                onClick={() => {
                  onChange(quality.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-2.5 text-left transition-colors flex items-center gap-2 justify-center
                  ${quality.value === value 
                    ? 'bg-[#CDFF00]/10 text-[#CDFF00]' 
                    : 'text-white hover:bg-[#2A2A2C]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{quality.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
