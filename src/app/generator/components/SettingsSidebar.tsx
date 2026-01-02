'use client';

import { motion } from 'framer-motion';
import { DynamicSettings } from '@/components/generator/DynamicSettings';
import { SectionType, ModelInfo } from '../config';

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
}: SettingsSidebarProps) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l border-white/5 bg-[var(--bg)] overflow-hidden flex-shrink-0"
    >
      <div className="w-[320px] h-full overflow-y-auto p-4 space-y-4">
        {/* Model Info */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              {modelInfo?.icon && <modelInfo.icon className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)]">{modelInfo?.name}</h3>
              <p className="text-xs text-gray-500">{modelInfo?.description}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <span className="text-sm text-gray-400">Стоимость</span>
            <span className="text-lg font-bold text-cyan-400">{currentCost}⭐</span>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Настройки</h3>
          <DynamicSettings
            modelId={currentModel}
            type={activeSection}
            values={settings}
            onChange={onSettingChange}
            onValidationChange={onValidationChange}
          />
        </div>

        {/* Balance */}
        {isLoggedIn && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Баланс</span>
              <span className="text-lg font-bold text-[var(--text)]">{balance}⭐</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

