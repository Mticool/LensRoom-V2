'use client';

import { Info } from 'lucide-react';
import { VIDEO_MODELS_CONFIG, type VideoModelSetting } from '@/config/video-models-config';

interface SettingControlProps {
  settingKey: string;
  setting: VideoModelSetting;
  value: any;
  onChange: (value: any) => void;
}

// Helper to get user-friendly label names
function getFriendlyLabel(key: string, label: string): string {
  const labelMap: Record<string, string> = {
    'duration_seconds': 'Duration (seconds)',
    'resolution': 'Resolution',
    'aspect_ratio': 'Aspect Ratio',
    'mode': 'Mode',
    'quality': 'Quality',
    'style': 'Style',
    'camera_motion': 'Camera Motion',
  };
  return labelMap[key] || label;
}

function SettingControl({ settingKey, setting, value, onChange }: SettingControlProps) {
  const displayLabel = getFriendlyLabel(settingKey, setting.label);
  
  if (setting.type === 'buttons') {
    return (
      <div>
        <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">{displayLabel}</label>
        <div className="grid grid-cols-2 gap-2">
          {setting.options?.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                value === opt.value
                  ? 'bg-[#D4FF00] text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (setting.type === 'select') {
    return (
      <div>
        <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">{displayLabel}</label>
        <select
          value={String(value || setting.default)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#D4FF00]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
        >
          {setting.options?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (setting.type === 'checkbox') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-semibold text-white">{setting.label}</label>
          {setting.description && (
            <div className="group relative">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <span className="absolute left-full ml-2 hidden group-hover:block bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">{setting.description}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? 'bg-[#D4FF00]' : 'bg-white/10'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
              value ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
            }`}
          />
        </button>
      </div>
    );
  }

  if (setting.type === 'slider') {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-white uppercase tracking-wide">{displayLabel}</label>
          <span className="text-xs text-gray-400">{value || setting.default}%</span>
        </div>
        <input
          type="range"
          min={setting.min || 0}
          max={setting.max || 100}
          step={setting.step || 1}
          value={value || setting.default}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#D4FF00]"
        />
      </div>
    );
  }

  return null;
}

interface DynamicSettingsProps {
  modelId: string;
  settings: Record<string, any>;
  onChange: (settings: Record<string, any>) => void;
}

export function DynamicSettings({ modelId, settings, onChange }: DynamicSettingsProps) {
  const config = VIDEO_MODELS_CONFIG[modelId];
  
  if (!config) return null;
  
  return (
    <div className="space-y-3">
      {Object.entries(config.settings)
        .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
        .map(([key, setting]) => (
          <SettingControl
            key={key}
            settingKey={key}
            setting={setting}
            value={settings[key]}
            onChange={(value) => onChange({ ...settings, [key]: value })}
          />
        ))}
    </div>
  );
}
