'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { PHOTO_MODELS } from '@/config/models';

interface ModelFilterProps {
  selectedModel: string; // 'all' | model id
  onChange: (model: string) => void;
  currentModel?: string; // Current generator model (to highlight)
  counts?: Record<string, number>; // Optional: count of generations per model
}

export function ModelFilter({ 
  selectedModel, 
  onChange, 
  currentModel,
  counts = {}
}: ModelFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  // Get model name for display
  const getModelName = (id: string) => {
    if (id === 'all') return 'Все модели';
    const model = PHOTO_MODELS.find(m => m.id === id);
    return model?.name || id;
  };

  // Get total count
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);

  // Filter only photo models that are featured
  const photoModels = PHOTO_MODELS.filter(m => m.featured);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#27272A] hover:bg-[#3A3A3D] border border-[#3A3A3D] transition-colors text-white"
      >
        <Filter className="w-4 h-4 text-[#A1A1AA]" />
        <span className="text-sm font-medium">
          {getModelName(selectedModel)}
          {selectedModel === 'all' && totalCount > 0 && (
            <span className="ml-1.5 text-xs text-[#A1A1AA]">({totalCount})</span>
          )}
          {selectedModel !== 'all' && counts[selectedModel] > 0 && (
            <span className="ml-1.5 text-xs text-[#A1A1AA]">({counts[selectedModel]})</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#A1A1AA] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg bg-[#1A1A1A] border border-[#3A3A3D] shadow-2xl z-50 py-2 max-h-96 overflow-y-auto">
          {/* All models option */}
          <button
            onClick={() => {
              onChange('all');
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left hover:bg-[#27272A] transition-colors flex items-center justify-between ${
              selectedModel === 'all' ? 'bg-[#27272A]' : ''
            }`}
          >
            <span className="text-sm font-medium text-white">Все модели</span>
            {totalCount > 0 && (
              <span className="text-xs text-[#A1A1AA] bg-[#27272A] px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="h-px bg-[#3A3A3D] my-2" />

          {/* Individual models */}
          {photoModels.map((model) => {
            const count = counts[model.id] || 0;
            const isCurrent = model.id === currentModel;
            const isSelected = selectedModel === model.id;

            return (
              <button
                key={model.id}
                onClick={() => {
                  onChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-[#27272A] transition-colors ${
                  isSelected ? 'bg-[#27272A]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {model.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#f59e0b] text-black font-medium">
                        Текущая
                      </span>
                    )}
                  </div>
                  {count > 0 && (
                    <span className="text-xs text-[#A1A1AA] bg-[#27272A] px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </div>
                {model.shortDescription && (
                  <p className="text-xs text-[#A1A1AA] mt-0.5 truncate">
                    {model.shortDescription}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
