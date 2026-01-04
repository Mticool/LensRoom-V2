'use client';

import { motion } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { DynamicSettings } from '@/components/generator/DynamicSettings';
import { SectionType, ModelInfo } from '../config';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  currentModel: string;
  activeSection: SectionType;
  modelInfo: ModelInfo | undefined;
  currentCost: number;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  onValidationChange: (isValid: boolean) => void;
  balance: number;
  isLoggedIn: boolean;
  onClose?: () => void; // For mobile close
}

export function SettingsSidebar({
  currentModel,
  activeSection,
  modelInfo,
  currentCost,
  settings,
  onSettingChange,
  onValidationChange,
  balance,
  isLoggedIn,
  onClose,
}: SettingsSidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      <motion.div
        // Desktop: slide from right
        // Mobile: slide from bottom
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        className={cn(
          "bg-[var(--bg)] overflow-hidden flex-shrink-0 z-50",
          // Desktop: right sidebar
          "hidden md:block md:border-l md:border-white/5 md:relative",
          "md:w-[320px]"
        )}
      >
        <div className="w-[340px] h-full overflow-y-auto p-5 space-y-5 scrollbar-premium">
        {/* Model Info - Premium Card */}
        <div className="p-5 rounded-[18px] bg-gradient-to-br from-[#a78bfa]/10 to-[#22d3ee]/10 border border-[var(--border)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--accent-subtle)] flex items-center justify-center">
              {modelInfo?.icon && <modelInfo.icon className="w-6 h-6 text-[var(--accent-primary)]" />}
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[var(--text)] tracking-tight">{modelInfo?.name}</h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">{modelInfo?.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <span className="text-[13px] text-[var(--muted)]">Стоимость</span>
            <span className="text-[20px] font-bold bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">{currentCost}⭐</span>
          </div>
        </div>

        {/* Settings - Premium Card */}
        <div className="p-5 rounded-[18px] bg-[var(--surface)] border border-[var(--border)]">
          <h3 className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-5">Настройки</h3>
          <DynamicSettings
            modelId={currentModel}
            type={activeSection}
            values={settings}
            onChange={onSettingChange}
            onValidationChange={onValidationChange}
          />
        </div>

        {/* Balance - Premium Card */}
        {isLoggedIn && (
          <div className="p-5 rounded-[18px] bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--muted)]">Баланс</span>
              <span className="text-[18px] font-bold text-[var(--text)]">{balance}⭐</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
    
    {/* Mobile: Bottom sheet */}
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[var(--bg)] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-hidden"
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          <h2 className="font-medium text-[var(--text)]">Настройки</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="overflow-y-auto p-4 space-y-4 pb-8 max-h-[calc(85vh-80px)]">
        {/* Model Info - Compact on mobile */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              {modelInfo?.icon && <modelInfo.icon className="w-5 h-5 text-purple-400" />}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text)]">{modelInfo?.name}</h3>
              <p className="text-xs text-gray-500">{modelInfo?.description}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-cyan-400">{currentCost}⭐</span>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <DynamicSettings
            modelId={currentModel}
            type={activeSection}
            values={settings}
            onChange={onSettingChange}
            onValidationChange={onValidationChange}
          />
        </div>

        {/* Balance - Mobile */}
        {isLoggedIn && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Ваш баланс</span>
              <span className="text-lg font-bold text-[var(--text)]">{balance}⭐</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
    </>
  );
}

