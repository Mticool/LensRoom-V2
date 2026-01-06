'use client';

import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionType, SectionConfig } from '../config';

interface ModelBarProps {
  sectionConfig: SectionConfig;
  currentModel: string;
  onModelChange: (model: string) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

export function ModelBar({
  sectionConfig,
  currentModel,
  onModelChange,
  showSettings,
  onToggleSettings,
}: ModelBarProps) {
  return (
    <div className="border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-14 z-30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Current Section Label */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <sectionConfig.icon className="w-4 h-4" />
            <span>{sectionConfig.section}</span>
          </div>
          
          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <select
              value={currentModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="input-smooth bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[var(--text)] cursor-pointer hover:bg-white/10"
            >
              {sectionConfig.models.map((model) => (
                <option key={model.id} value={model.id} className="bg-[#1a1a1a]">
                  {model.name} • {model.cost}⭐
                </option>
              ))}
            </select>
            
            <button
              onClick={onToggleSettings}
              className={cn(
                "btn-icon p-2 rounded-xl",
                showSettings ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:text-white"
              )}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}







