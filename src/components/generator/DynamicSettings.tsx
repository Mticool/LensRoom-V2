'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getModelConfig, type ModelSetting } from '@/config/image-models-config';

interface DynamicSettingsProps {
  modelId: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function DynamicSettings({ modelId, values, onChange }: DynamicSettingsProps) {
  const config = getModelConfig(modelId);

  if (!config) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Модель не найдена</p>
      </div>
    );
  }

  const renderSetting = (key: string, setting: ModelSetting) => {
    const value = values[key] ?? setting.default;

    switch (setting.type) {
      case 'select':
        return (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {setting.label}
              {setting.optional && <span className="text-gray-600 ml-1">(опционально)</span>}
            </label>
            <select
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {setting.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'buttons':
        return (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {setting.label}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {setting.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onChange(key, option.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    value === option.value
                      ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                      : "bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent-primary)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {setting.label}
              {setting.optional && <span className="text-gray-600 ml-1">(опционально)</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={setting.placeholder}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition resize-none"
            />
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {setting.label}
              {setting.optional && <span className="text-gray-600 ml-1">(опционально)</span>}
            </label>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(key, e.target.value ? Number(e.target.value) : undefined)}
              placeholder={setting.placeholder}
              min={setting.min}
              max={setting.max}
              step={setting.step}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            />
          </div>
        );

      case 'slider':
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {setting.label}
              </label>
              <span className="text-sm font-medium text-[var(--accent-primary)]">
                {value ?? setting.default}
              </span>
            </div>
            <input
              type="range"
              value={value ?? setting.default}
              onChange={(e) => onChange(key, Number(e.target.value))}
              min={setting.min}
              max={setting.max}
              step={setting.step}
              className="w-full h-2 bg-[var(--surface2)] rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, 
                  var(--accent-primary) 0%, 
                  var(--accent-primary) ${((value ?? setting.default ?? 0) / (setting.max ?? 100)) * 100}%, 
                  var(--surface2) ${((value ?? setting.default ?? 0) / (setting.max ?? 100)) * 100}%, 
                  var(--surface2) 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{setting.min}</span>
              <span>{setting.max}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(config.settings).map(([key, setting]) => 
        renderSetting(key, setting)
      )}
    </div>
  );
}

