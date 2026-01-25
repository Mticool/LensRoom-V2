'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { VIDEO_MODELS } from '@/config/models';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = VIDEO_MODELS.find((m) => m.id === value) || VIDEO_MODELS[0];

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-0.5">Модель</label>

      {/* Selected Model Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-md text-[var(--text)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedModel.name}</span>
          {selectedModel.modelTag && (
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                selectedModel.modelTag === 'NEW'
                  ? 'bg-green-500/10 text-green-500'
                  : selectedModel.modelTag === 'ULTRA'
                    ? 'bg-purple-500/10 text-purple-500'
                    : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              }`}
            >
              {selectedModel.modelTag}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute z-50 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg max-h-[300px] overflow-auto">
            {VIDEO_MODELS.map((model) => {
              const isSelected = model.id === value;

              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full px-3 py-1.5 text-left hover:bg-[var(--surface2)] transition-colors ${
                    isSelected ? 'bg-[var(--surface2)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-medium text-[var(--text)]">{model.name}</span>
                        {model.modelTag && (
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                              model.modelTag === 'NEW'
                                ? 'bg-green-500/10 text-green-500'
                                : model.modelTag === 'ULTRA'
                                  ? 'bg-purple-500/10 text-purple-500'
                                  : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                            }`}
                          >
                            {model.modelTag}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] line-clamp-1">
                        {model.description}
                      </p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
