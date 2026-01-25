'use client';

import { useState } from 'react';
import { Check, ChevronDown, Volume2, Image, Film, Sparkles } from 'lucide-react';
import { VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { getModelIcon, ModelBadge, type ModelTag } from '@/components/icons/model-icons';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

// Capability chip component
function CapabilityChip({ icon: Icon, label, active = true }: { icon: React.ElementType; label: string; active?: boolean }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium bg-white/5 text-white/60 rounded">
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = VIDEO_MODELS.find((m) => m.id === value) || VIDEO_MODELS[0];
  const ModelIcon = getModelIcon(selectedModel.id);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
        Модель
      </label>

      {/* Selected Model Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] rounded-xl text-white transition-all group"
      >
        <div className="flex-shrink-0">
          <ModelIcon size={28} className="opacity-90 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{selectedModel.name}</span>
            {selectedModel.modelTag && (
              <ModelBadge tag={selectedModel.modelTag as ModelTag} />
            )}
          </div>
          <span className="text-[11px] text-white/40">{selectedModel.shortLabel}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute z-50 w-full mt-2 bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl max-h-[400px] overflow-auto p-2">
            {VIDEO_MODELS.filter(m => m.featured).map((model) => {
              const isSelected = model.id === value;
              const Icon = getModelIcon(model.id);

              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--higgs-primary)]/10 border border-[var(--higgs-primary)]/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon size={32} className={isSelected ? 'opacity-100' : 'opacity-70'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-[var(--higgs-primary)]' : 'text-white'}`}>
                        {model.name}
                      </span>
                      {model.modelTag && (
                        <ModelBadge tag={model.modelTag as ModelTag} />
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 line-clamp-2 mb-2">
                      {model.description}
                    </p>
                    {/* Capability chips */}
                    <div className="flex flex-wrap gap-1">
                      <CapabilityChip icon={Volume2} label="Audio" active={model.supportsAudio} />
                      <CapabilityChip icon={Image} label="I2V" active={model.supportsI2v} />
                      <CapabilityChip icon={Film} label="V2V" active={model.modes.includes('v2v')} />
                      <CapabilityChip icon={Sparkles} label="Styles" active={!!(model as VideoModelConfig).styleOptions?.length} />
                      <span className="px-1.5 py-0.5 text-[9px] text-white/30">
                        {model.durationOptions.length > 0
                          ? model.durationOptions.map(d => typeof d === 'number' ? `${d}s` : d).join('/')
                          : 'Variable'
                        }
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-5 h-5 text-[var(--higgs-primary)] flex-shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
