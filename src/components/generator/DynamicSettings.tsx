'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getModelConfig, type ModelSetting } from '@/config/image-models-config';
import { getVideoModelConfig, type VideoModelSetting, type VideoModelConfig } from '@/config/video-models-config';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface DynamicSettingsProps {
  modelId: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onValidationChange?: (isValid: boolean) => void;
  type?: 'image' | 'video'; // Тип генератора
}

// LocalStorage ключ для сохранения настроек
const SETTINGS_STORAGE_KEY = 'lensroom_model_settings';

// Превью для соотношений сторон
const AspectRatioPreview = ({ ratio }: { ratio: string }) => {
  const ratioMap: Record<string, { width: number; height: number }> = {
    '1:1': { width: 40, height: 40 },
    '16:9': { width: 56, height: 32 },
    '9:16': { width: 28, height: 50 },
    '4:3': { width: 48, height: 36 },
    '3:4': { width: 36, height: 48 },
    '21:9': { width: 64, height: 28 },
    '3:2': { width: 48, height: 32 },
    '2:3': { width: 32, height: 48 },
    '4:5': { width: 36, height: 45 },
    '5:4': { width: 45, height: 36 },
    'auto': { width: 40, height: 40 }
  };

  const dimensions = ratioMap[ratio] || ratioMap['1:1'];

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="border-2 border-cyan-400 rounded bg-cyan-400/10"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
};

export function DynamicSettings({ modelId, values, onChange, onValidationChange, type = 'image' }: DynamicSettingsProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Получаем конфигурацию в зависимости от типа
  const config = type === 'video' ? getVideoModelConfig(modelId) : getModelConfig(modelId);

  // Загрузка настроек из localStorage при монтировании
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const modelSettings = parsed[modelId];
        if (modelSettings) {
          // Восстанавливаем сохраненные настройки
          Object.entries(modelSettings).forEach(([key, value]) => {
            onChange(key, value);
          });
        }
      } catch (e) {
        console.error('Failed to load settings from localStorage:', e);
      }
    }
  }, [modelId]);

  // Сохранение настроек в localStorage при изменении
  useEffect(() => {
    if (Object.keys(values).length > 0) {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      let allSettings = {};
      
      if (savedSettings) {
        try {
          allSettings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse settings from localStorage:', e);
        }
      }

      allSettings = {
        ...allSettings,
        [modelId]: values
      };

      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(allSettings));
    }
  }, [values, modelId]);

  // Валидация обязательных полей
  useEffect(() => {
    if (!config || !onValidationChange) return;

    const isValid = Object.entries(config.settings).every(([key, setting]) => {
      if (setting.required) {
        const value = values[key];
        return value !== undefined && value !== null && value !== '';
      }
      return true;
    });

    onValidationChange(isValid);
  }, [values, config, onValidationChange]);

  if (!config) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Модель не найдена</p>
      </div>
    );
  }

  // Сортируем настройки по order
  const sortedSettings = Object.entries(config.settings).sort(([, a], [, b]) => {
    return (a.order || 999) - (b.order || 999);
  });

  const renderSetting = (key: string, setting: ModelSetting | VideoModelSetting) => {
    const value = values[key] ?? setting.default;

    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-2"
      >
        {/* Label с тултипом */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
            {setting.label}
            {setting.required && (
              <span className="text-red-400 text-sm">*</span>
            )}
            {setting.optional && (
              <span className="text-gray-600 text-xs normal-case">(опционально)</span>
            )}
            {setting.description && (
              <div className="relative">
                <Info
                  className="w-3.5 h-3.5 text-gray-500 cursor-help"
                  onMouseEnter={() => setShowTooltip(key)}
                  onMouseLeave={() => setShowTooltip(null)}
                />
                <AnimatePresence>
                  {showTooltip === key && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-white/20 rounded-lg shadow-xl text-xs text-gray-300 font-normal"
                    >
                      {setting.description}
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-black border-l border-t border-white/20 transform rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </label>
          {/* Превью для aspect ratio */}
          {key === 'aspectRatio' && value && (
            <div className="w-16 h-12">
              <AspectRatioPreview ratio={value} />
            </div>
          )}
        </div>

        {setting.type === 'select' && (
          <select
            value={String(value)}
            onChange={(e) => {
              const val = e.target.value;
              // Пытаемся преобразовать в число, если это число
              const numVal = Number(val);
              onChange(key, !isNaN(numVal) && val !== '' ? numVal : val);
            }}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border text-[var(--text)] text-sm focus:outline-none transition-all",
              setting.required && !value
                ? "border-red-500/50 focus:border-red-500"
                : "border-[var(--border)] focus:border-[var(--accent-primary)]"
            )}
          >
            {setting.options?.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {setting.type === 'buttons' && (
          <div className="grid grid-cols-4 gap-2">
            {setting.options?.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => onChange(key, option.value)}
                className={cn(
                  "px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200",
                  value === option.value
                    ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/25 scale-105"
                    : "bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] hover:border-cyan-500/50 hover:text-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {setting.type === 'textarea' && (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={setting.placeholder}
            rows={3}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border text-[var(--text)] text-sm focus:outline-none transition-all resize-none",
              setting.required && !value
                ? "border-red-500/50 focus:border-red-500"
                : "border-[var(--border)] focus:border-[var(--accent-primary)]"
            )}
          />
        )}

        {setting.type === 'number' && (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(key, e.target.value ? Number(e.target.value) : undefined)}
            placeholder={setting.placeholder}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border text-[var(--text)] text-sm focus:outline-none transition-all",
              setting.required && !value
                ? "border-red-500/50 focus:border-red-500"
                : "border-[var(--border)] focus:border-[var(--accent-primary)]"
            )}
          />
        )}

        {setting.type === 'slider' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--accent-primary)]">
                {value ?? setting.default}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                value={value ?? setting.default}
                onChange={(e) => onChange(key, Number(e.target.value))}
                min={setting.min}
                max={setting.max}
                step={setting.step}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer transition-all"
                style={{
                  background: `linear-gradient(to right, 
                    rgb(168, 85, 247) 0%, 
                    rgb(6, 182, 212) ${((value ?? setting.default ?? 0) / (setting.max ?? 100)) * 100}%, 
                    rgb(30, 30, 30) ${((value ?? setting.default ?? 0) / (setting.max ?? 100)) * 100}%, 
                    rgb(30, 30, 30) 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{setting.min}</span>
              <span>{setting.max}</span>
            </div>
          </div>
        )}

        {setting.type === 'checkbox' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange(key, !value)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-300 border",
                value
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 border-transparent shadow-lg shadow-purple-500/25"
                  : "bg-[var(--surface2)] border-[var(--border)]"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg",
                  value ? "transform translate-x-6" : ""
                )}
              />
            </button>
            <span className="text-sm text-gray-400">
              {value ? 'Включено' : 'Выключено'}
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {sortedSettings.map(([key, setting]) => renderSetting(key, setting))}
      </AnimatePresence>
    </div>
  );
}
