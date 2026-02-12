'use client';

import { ChevronRight } from 'lucide-react';
import { getModelIcon } from '@/components/icons/model-icons';
import type { VideoModelConfig } from '@/config/models';

interface ModelCardProps {
  model: VideoModelConfig;
  onChangeClick: () => void;
  preview?: string | null;
}

export function ModelCard({ model, onChangeClick, preview }: ModelCardProps) {
  const ModelIcon = getModelIcon(model.id);
  
  return (
    <div 
      className="relative h-32 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden cursor-pointer group"
      onClick={onChangeClick}
    >
      {/* Background Preview */}
      {preview && (
        <div className="absolute inset-0 opacity-20">
          <img 
            src={preview} 
            alt="" 
            className="w-full h-full object-cover blur-sm" 
          />
        </div>
      )}
      
      {/* Content */}
      <div className="relative h-full p-3 flex flex-col justify-between">
        {/* Change Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChangeClick();
          }}
          className="self-end px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-md text-white text-[11px] font-medium hover:bg-white/25 transition-colors flex items-center gap-1"
        >
          Change
          <ChevronRight className="w-3 h-3" />
        </button>
        
        {/* Model Info */}
        <div>
          <div className="text-[#8cf425] text-xs font-bold uppercase tracking-wide mb-0.5">
            {model.modelTag || 'GENERAL'}
          </div>
          <div className="text-white text-base font-semibold">{model.name}</div>
        </div>
      </div>
    </div>
  );
}
