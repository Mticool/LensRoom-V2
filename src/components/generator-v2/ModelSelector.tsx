'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, Zap, Image as ImageIcon, Star } from 'lucide-react';
import { PHOTO_MODELS, PhotoModelConfig } from '@/config/models';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  direction?: 'up' | 'down';
}

export function ModelSelector({ value, onChange, disabled, direction = 'up' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter only active photo models (not commented out)
  const activeModels = PHOTO_MODELS.filter(m => m.featured);
  const selectedModel = activeModels.find(m => m.id === value) || activeModels[0];

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

  const getModelIcon = (model: PhotoModelConfig) => {
    if (model.quality === 'ultra') return Sparkles;
    if (model.speed === 'fast') return Zap;
    return ImageIcon;
  };

  const getPricingLabel = (model: PhotoModelConfig): string => {
    if (typeof model.pricing === 'number') {
      return `${model.pricing}⭐`;
    }
    const prices = Object.values(model.pricing);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `${min}⭐` : `${min}-${max}⭐`;
  };

  const SelectedIcon = getModelIcon(selectedModel);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors min-w-[180px]
          ${disabled 
            ? 'bg-[#1C1C1E] border-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed' 
            : 'bg-[#1E1E20] border-[#3A3A3C] text-white hover:border-[#4A4A4C]'
          }
        `}
      >
        <SelectedIcon className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left truncate">{selectedModel.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-72 bg-[#1E1E20] border border-[#3A3A3C] rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto ${
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          {activeModels.map((model) => {
            const Icon = getModelIcon(model);
            const pricingLabel = getPricingLabel(model);
            
            return (
              <button
                key={model.id}
                onClick={() => {
                  onChange(model.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-3 py-3 text-left transition-colors flex items-start gap-3 border-b border-[#2A2A2C] last:border-0
                  ${model.id === value 
                    ? 'bg-[#f59e0b]/10 text-[#f59e0b]' 
                    : 'text-white hover:bg-[#2A2A2C]'
                  }
                `}
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{model.name}</span>
                    <span className="text-xs font-semibold text-[#f59e0b] flex items-center gap-0.5">
                      {pricingLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2">{model.shortDescription || model.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      model.speed === 'fast' ? 'bg-green-500/10 text-green-400' :
                      model.speed === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {model.speed}
                    </span>
                    {model.supportsI2i && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        I2I
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      model.quality === 'ultra' ? 'bg-purple-500/10 text-purple-400' :
                      model.quality === 'high' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {model.quality}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
