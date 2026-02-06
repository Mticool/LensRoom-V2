'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface QualitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options?: string[];
}

// Quality descriptions for Nano Banana Pro
const QUALITY_INFO: Record<string, { label: string; description: string; badge?: string }> = {
  '1K': {
    label: '1K',
    description: 'Fast · Quick Generation, Good Resolution',
  },
  '2K': {
    label: '2K',
    description: 'Balanced · Recommended For Most Use Cases',
  },
  '4K': {
    label: '4K',
    description: 'Ultra · Highest Detail, Longer Processing',
    badge: 'Premium',
  },
  '8K': {
    label: '8K',
    description: 'Max Detail · Best For Large Prints',
    badge: 'Ultra',
  },
  // Lowercase variants
  '1k': { label: '1K', description: 'Fast · Quick Generation, Good Resolution' },
  '2k': { label: '2K', description: 'Balanced · Recommended For Most Use Cases' },
  '4k': { label: '4K', description: 'Ultra · Highest Detail, Longer Processing', badge: 'Premium' },
  '8k': { label: '8K', description: 'Max Detail · Best For Large Prints', badge: 'Ultra' },
  // Seedream
  'basic': { label: 'Basic (2K)', description: 'Balanced · 2K quality' },
  'high': { label: 'High (4K)', description: 'Ultra · 4K quality', badge: 'Premium' },
  // GPT Image 1.5
  'medium': { label: 'Medium', description: 'Standard · Faster generation' },
  // Grok Imagine (if used in generic selector)
  'normal': { label: 'Normal', description: 'Balanced · Default mode' },
  'fun': { label: 'Fun', description: 'Creative · More playful results' },
  'spicy': { label: 'Spicy', description: 'Bold · Most creative' },
};

export function QualitySelector({ value, onChange, disabled, options }: QualitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);

  // Default quality options if none provided
  const qualityOptions = options || ['1K', '2K', '4K'];

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      const inTrigger = triggerRef.current?.contains(t);
      const inMenu = menuRef.current?.contains(t);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuWidth = 340;
      const padding = 8;
      const left = Math.min(Math.max(padding, rect.left), window.innerWidth - menuWidth - padding);
      const bottom = Math.max(padding, window.innerHeight - rect.top + 8);
      setMenuPos({ left, bottom });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  const currentQuality = QUALITY_INFO[value] || { label: value, description: '' };

  return (
    <div className="relative" ref={triggerRef}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[100px]
          ${disabled
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
          }
        `}
        title="Качество"
      >
        <span className="text-sm font-medium flex-1 text-left">{currentQuality.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu - opens upward */}
      {isOpen && typeof document !== 'undefined' && menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bg-[#1E1E20] border border-[#3A3A3C] rounded-xl shadow-2xl overflow-hidden z-[2000] min-w-[340px]"
            style={{ left: `${menuPos.left}px`, bottom: `${menuPos.bottom}px` }}
          >
            <div className="py-2">
              <div className="px-3 py-2 text-xs text-[#A1A1AA] uppercase tracking-wider">
                Select quality
              </div>
              {qualityOptions.map((quality) => {
                const info = QUALITY_INFO[quality] || { label: quality, description: '' };
                const isSelected = quality === value;
                return (
                  <button
                    key={quality}
                    onClick={() => {
                      onChange(quality);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-3 py-3 text-left transition-colors flex items-start gap-3
                      ${isSelected ? 'bg-[#2A2A2C]' : 'hover:bg-[#2A2A2C]'}
                    `}
                  >
                    <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                      {isSelected && <Check className="w-5 h-5 text-[#f59e0b]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-[#E5E5E7]'}`}>
                          {info.label}
                        </span>
                        {info.badge && (
                          <span className="px-1.5 py-0.5 bg-[#f59e0b] text-black text-[10px] font-bold rounded">
                            {info.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#A1A1AA] leading-snug">
                        {info.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}
