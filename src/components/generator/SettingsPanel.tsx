'use client';

import { cn } from '@/lib/utils';
import { Settings as SettingsIcon, RotateCcw, ChevronDown, Zap } from 'lucide-react';

export type GenerationMode = 'text' | 'image' | 'video' | 'audio';

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  icon: any; // LucideIcon
  cost: number;
  badge?: string;
  description: string;
}

export interface GenerationSettings {
  model?: string;
  // Common settings
  quality?: string;
  aspectRatio?: string;
  // Image-specific
  style?: string;
  // Video-specific
  duration?: string;
  fps?: string;
  // Audio-specific
  voice?: string;
  speed?: number;
  tone?: string;
  // Text-specific
  length?: string;
  language?: string;
}

interface SettingsPanelProps {
  mode: GenerationMode;
  currentModel: ModelOption;
  models: ModelOption[];
  settings: GenerationSettings;
  onModelSelect: () => void;
  onSettingsChange: (settings: GenerationSettings) => void;
  onReset: () => void;
  onGenerate: () => void;
  canGenerate: boolean;
  isGenerating: boolean;
}

export function SettingsPanel({
  mode,
  currentModel,
  models,
  settings,
  onModelSelect,
  onSettingsChange,
  onReset,
  onGenerate,
  canGenerate,
  isGenerating,
}: SettingsPanelProps) {
  const ModelIcon = currentModel.icon;

  const updateSetting = (key: keyof GenerationSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  // Quality options based on mode
  const getQualityOptions = () => {
    switch (mode) {
      case 'image':
        return ['Turbo', 'Balanced', 'Quality', 'HD', '2K', '4K'];
      case 'video':
        return ['720p', '1080p', '2K', '4K'];
      case 'audio':
        return ['Standard', 'High', 'Ultra'];
      default:
        return [];
    }
  };

  // Aspect ratio options
  const aspectRatioOptions = ['1:1', '9:16', '16:9', '4:3', '3:4', '21:9'];

  // Style options for images
  const styleOptions = ['Photorealistic', 'Illustration', 'Minimalist', '3D Render', 'Abstract', 'Cinematic'];

  // Duration options for video
  const durationOptions = ['5', '6', '8', '10', '15', '20', '30'];

  // FPS options for video
  const fpsOptions = ['24', '30', '60'];

  // Voice options for audio
  const voiceOptions = ['Female 1', 'Female 2', 'Male 1', 'Male 2', 'Neutral'];

  // Tone options for audio
  const toneOptions = ['Neutral', 'Energetic', 'Calm', 'Professional'];

  // Length options for text
  const lengthOptions = ['Concise', 'Medium', 'Detailed'];

  // Language options for text
  const languageOptions = ['English', 'Russian', 'Mixed'];

  return (
    <aside className="w-80 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-[var(--text)]">
          <SettingsIcon className="w-4 h-4" />
          Settings
        </h3>
        <button 
          onClick={onReset} 
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface2)] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Model Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Model</label>
          <button
            onClick={onModelSelect}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                {ModelIcon && <ModelIcon className="w-5 h-5 text-[var(--accent-primary)]" />}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-[var(--text)]">{currentModel.name}</div>
                <div className="text-xs text-[var(--muted)]">{currentModel.provider}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          </button>
        </div>

        {/* Quality Dropdown (for image/video/audio) */}
        {(mode === 'image' || mode === 'video' || mode === 'audio') && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Quality</label>
            <select
              value={settings.quality || (mode === 'image' ? '2K' : mode === 'video' ? '1080p' : 'High')}
              onChange={(e) => updateSetting('quality', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {getQualityOptions().map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Aspect Ratio (for image/video) */}
        {(mode === 'image' || mode === 'video') && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Aspect Ratio</label>
            <select
              value={settings.aspectRatio || '9:16'}
              onChange={(e) => updateSetting('aspectRatio', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {aspectRatioOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Style (for image only) */}
        {mode === 'image' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Style</label>
            <select
              value={settings.style || 'Photorealistic'}
              onChange={(e) => updateSetting('style', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {styleOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Duration (for video only) */}
        {mode === 'video' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Duration (s)</label>
            <select
              value={settings.duration || '10'}
              onChange={(e) => updateSetting('duration', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {durationOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}s</option>
              ))}
            </select>
          </div>
        )}

        {/* FPS (for video only) */}
        {mode === 'video' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">FPS</label>
            <select
              value={settings.fps || '24'}
              onChange={(e) => updateSetting('fps', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {fpsOptions.map((opt) => (
                <option key={opt} value={opt}>{opt} fps</option>
              ))}
            </select>
          </div>
        )}

        {/* Voice (for audio only) */}
        {mode === 'audio' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Voice</label>
            <select
              value={settings.voice || 'Female 1'}
              onChange={(e) => updateSetting('voice', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {voiceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Speed (for audio only) */}
        {mode === 'audio' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Speed</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.speed || 1}
                onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
                className="flex-1 accent-[var(--accent-primary)]"
              />
              <span className="text-sm font-semibold w-12 text-right">
                {settings.speed || 1}x
              </span>
            </div>
          </div>
        )}

        {/* Tone (for audio only) */}
        {mode === 'audio' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Tone</label>
            <select
              value={settings.tone || 'Neutral'}
              onChange={(e) => updateSetting('tone', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {toneOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Length (for text only) */}
        {mode === 'text' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Length</label>
            <select
              value={settings.length || 'Medium'}
              onChange={(e) => updateSetting('length', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {lengthOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tone (for text only) */}
        {mode === 'text' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Tone</label>
            <select
              value={settings.tone || 'Professional'}
              onChange={(e) => updateSetting('tone', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              <option value="Professional">Professional</option>
              <option value="Casual">Casual</option>
              <option value="Technical">Technical</option>
              <option value="Creative">Creative</option>
            </select>
          </div>
        )}

        {/* Language (for text only) */}
        {mode === 'text' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Language</label>
            <select
              value={settings.language || 'English'}
              onChange={(e) => updateSetting('language', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
            >
              {languageOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Generate Button - Bottom of Right Column */}
      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className={cn(
            "w-full px-4 py-3.5 rounded-xl flex items-center justify-center gap-2.5 font-semibold transition-all",
            canGenerate && !isGenerating
              ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:opacity-90 shadow-lg shadow-purple-500/30"
              : "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
          )}
        >
          <Zap className="w-5 h-5" />
          <span>Generate</span>
        </button>
        
        {/* Cost Display */}
        <div className="mt-3 flex items-center justify-between text-xs px-2">
          <span className="text-[var(--muted)]">Cost:</span>
          <span className="font-bold text-[var(--accent-primary)]">{currentModel.cost} ⭐</span>
        </div>
      </div>
    </aside>
  );
}
