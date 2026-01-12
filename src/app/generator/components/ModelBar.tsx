'use client';

import { useState } from 'react';
import { Settings2, ChevronDown, Sparkles, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionType, SectionConfig } from '../config';

interface ModelBarProps {
  sectionConfig: SectionConfig;
  currentModel: string;
  onModelChange: (model: string) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

// Model badges/icons
const MODEL_BADGES: Record<string, { icon: typeof Sparkles; color: string }> = {
  'veo-3.1': { icon: Sparkles, color: 'from-cyan-500 to-blue-500' },
  'grok-imagine': { icon: Zap, color: 'from-orange-500 to-red-500' },
  'grok-video': { icon: Zap, color: 'from-orange-500 to-red-500' },
  'sora-2-pro': { icon: Crown, color: 'from-purple-500 to-pink-500' },
  'kling-motion-control': { icon: Sparkles, color: 'from-violet-500 to-cyan-500' },
};

export function ModelBar({
  sectionConfig,
  currentModel,
  onModelChange,
  showSettings,
  onToggleSettings,
}: ModelBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentModelInfo = sectionConfig.models.find(m => m.id === currentModel);
  const badge = MODEL_BADGES[currentModel];

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-2xl sticky top-14 z-30">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Model Selector - Premium Design */}
          <div className="relative flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300",
                "hover:bg-[var(--surface2)] group",
                isExpanded && "bg-[var(--surface2)]"
              )}
            >
              {/* Model Icon */}
              {badge ? (
                <div className={cn(
                  "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                  badge.color
                )}>
                  <badge.icon className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[var(--surface3)] flex items-center justify-center">
                  <sectionConfig.icon className="w-4 h-4 text-[var(--muted)]" />
                </div>
              )}
              
              {/* Model Name */}
              <div className="text-left">
                <div className="text-[14px] font-medium text-[var(--text)]">
                  {currentModelInfo?.name || 'Выберите модель'}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {currentModelInfo?.badge || currentModelInfo?.description || ''}
                </div>
              </div>
              
              <ChevronDown className={cn(
                "w-4 h-4 text-[var(--muted)] transition-transform duration-200 ml-2",
                isExpanded && "rotate-180"
              )} />
            </button>
            
            {/* Models Dropdown - Premium Grid */}
            <AnimatePresence>
              {isExpanded && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsExpanded(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute top-full left-0 mt-2 w-[400px] z-50 bg-[var(--surface)]/98 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                  >
                    <div className="p-3 grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                      {sectionConfig.models.map((model) => {
                        const isActive = model.id === currentModel;
                        
                        return (
                          <button
                            key={model.id}
                            onClick={() => {
                              onModelChange(model.id);
                              setIsExpanded(false);
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                              isActive 
                                ? "bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30" 
                                : "hover:bg-[var(--surface2)] border border-transparent"
                            )}
                          >
                            {/* Info - no icons */}
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                "text-[13px] font-medium truncate",
                                isActive ? "text-[var(--accent-primary)]" : "text-[var(--text)]"
                              )}>
                                {model.name}
                              </div>
                              <div className="text-[11px] text-[var(--muted)]">
                                {model.badge || ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          {/* Settings Button */}
          <button
            onClick={onToggleSettings}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              showSettings 
                ? "bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 text-[var(--accent-primary)]" 
                : "bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)]"
            )}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}