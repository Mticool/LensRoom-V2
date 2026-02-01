'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options?: string[];
}

export function AspectRatioSelector({ value, onChange, disabled, options }: AspectRatioSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null);

  // Default aspect ratios if none provided
  const aspectRatios = options || ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

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
      const menuWidth = 220;
      const padding = 8;
      const left = Math.min(Math.max(padding, rect.left), window.innerWidth - menuWidth - padding);
      const bottom = Math.max(padding, window.innerHeight - rect.top + 8); // open upward
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

  return (
    <div className="relative" ref={triggerRef}>
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[90px]
          ${disabled
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C] hover:bg-[#2A2A2C]'
          }
        `}
        title="Пропорции"
      >
        <span className="text-sm font-medium flex-1 text-left">{value}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu - opens upward with scroll */}
      {isOpen && typeof document !== 'undefined' && menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bg-[#1E1E20] border border-[#3A3A3C] rounded-xl shadow-2xl overflow-hidden z-[2000] w-[220px]"
            style={{ left: `${menuPos.left}px`, bottom: `${menuPos.bottom}px` }}
          >
            <div className="py-2 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 text-xs text-[#A1A1AA] uppercase tracking-wider">
                Aspect ratio
              </div>
              {aspectRatios.map((ratio) => {
                const isSelected = ratio === value;
                return (
                  <button
                    key={ratio}
                    onClick={() => {
                      onChange(ratio);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left transition-colors flex items-center justify-between
                      ${isSelected ? 'bg-[#2A2A2C]' : 'hover:bg-[#2A2A2C]'}
                    `}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-[#E5E5E7]'}`}>
                      {ratio}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#f59e0b]" />}
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
