'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AspectRatioOption {
  value: string;
  label: string;
  desc: string;
}

const DEFAULT_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '1:1', label: '1:1', desc: '' },
  { value: '16:9', label: '16:9', desc: '' },
  { value: '9:16', label: '9:16', desc: '' },
  { value: '4:3', label: '4:3', desc: '' },
  { value: '3:4', label: '3:4', desc: '' },
];

interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options?: string[]; // Custom aspect ratio options (e.g., ['1:1', '16:9', '9:16', '4:3'])
}

export function AspectRatioSelector({ value, onChange, disabled, options }: AspectRatioSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build aspect ratio options from provided options array or use defaults
  const aspectRatios: AspectRatioOption[] = options
    ? options.map(opt => ({
        value: opt,
        label: opt,
        desc: '',
      }))
    : DEFAULT_ASPECT_RATIOS;

  const selectedOption = aspectRatios.find(r => r.value === value) || aspectRatios[0];

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
        <span className="text-sm font-medium">{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-28 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => {
                onChange(ratio.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2.5 text-left transition-colors flex items-center justify-center
                ${ratio.value === value 
                  ? 'bg-[#CDFF00]/10 text-[#CDFF00]' 
                  : 'text-white hover:bg-[#2A2A2C]'
                }
              `}
            >
              <span className="text-sm font-medium">{ratio.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
