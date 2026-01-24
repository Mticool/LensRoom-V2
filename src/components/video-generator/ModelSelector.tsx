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
      <label className="block text-sm font-medium mb-2">Модель</label>

      {/* Selected Model Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-lg text-[var(--text)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{selectedModel.name}</span>
          {selectedModel.modelTag && (
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded ${
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
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute z-50 w-full mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg max-h-[400px] overflow-auto">
            {VIDEO_MODELS.map((model) => {
              const isSelected = model.id === value;

              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--surface2)] transition-colors ${
                    isSelected ? 'bg-[var(--surface2)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--text)]">{model.name}</span>
                        {model.modelTag && (
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
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
                      <p className="text-xs text-[var(--muted)] line-clamp-2">
                        {model.description}
                      </p>
                      {model.shortLabel && (
                        <p className="text-xs text-[var(--muted)] mt-1">{model.shortLabel}</p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
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
