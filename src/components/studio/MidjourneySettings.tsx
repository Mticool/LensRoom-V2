/**
 * Midjourney Settings Panel
 * Specific controls for MJ generation: version, speed, stylization, weirdness, variety
 */

'use client';

import { useState } from 'react';
import { Sparkles, Zap, Palette, Wand2, Shuffle, Info } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  MJ_VERSIONS,
  MJ_SPEEDS,
  MJ_LIMITS,
  MJ_DEFAULT_SETTINGS,
  calculateMjCost,
  type MjSettings,
  type MjVersion,
  type MjSpeed,
} from '@/config/midjourneyConfig';

interface MidjourneySettingsProps {
  settings: MjSettings;
  onChange: (settings: MjSettings) => void;
  disabled?: boolean;
}

export function MidjourneySettings({
  settings,
  onChange,
  disabled = false,
}: MidjourneySettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateSetting = <K extends keyof MjSettings>(
    key: K,
    value: MjSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const estimatedCost = calculateMjCost(settings);

  return (
    <div className="space-y-6">
      {/* Cost indicator */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30">
        <span className="text-sm text-[var(--muted)]">Стоимость генерации</span>
        <span className="text-lg font-bold text-[var(--gold)]">
          {estimatedCost} ⭐
        </span>
      </div>

      {/* Version selector */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
          <Sparkles className="w-4 h-4 text-[var(--gold)]" />
          Версия модели
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MJ_VERSIONS.map((version) => (
            <button
              key={version.id}
              onClick={() => updateSetting('version', version.id)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${settings.version === version.id
                  ? 'bg-[var(--gold)] text-black'
                  : 'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {version.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">
          {MJ_VERSIONS.find((v) => v.id === settings.version)?.description}
        </p>
      </div>

      {/* Speed selector */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
          <Zap className="w-4 h-4 text-[var(--gold)]" />
          Скорость генерации
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MJ_SPEEDS.map((speed) => (
            <button
              key={speed.id}
              onClick={() => updateSetting('speed', speed.id)}
              disabled={disabled}
              className={`
                relative px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${settings.speed === speed.id
                  ? 'bg-[var(--gold)] text-black'
                  : 'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span>{speed.label}</span>
              {speed.costMultiplier !== 1 && (
                <span className={`
                  absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full
                  ${speed.costMultiplier < 1 ? 'bg-green-500' : 'bg-orange-500'}
                  text-white font-bold
                `}>
                  {speed.costMultiplier < 1 ? '-50%' : 'x2'}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">
          {MJ_SPEEDS.find((s) => s.id === settings.speed)?.description}
        </p>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-[var(--gold)] hover:text-[var(--gold-hover)]"
      >
        <Wand2 className="w-4 h-4" />
        {showAdvanced ? 'Скрыть' : 'Показать'} расширенные настройки
      </button>

      {/* Advanced settings */}
      {showAdvanced && (
        <div className="space-y-6 pt-4 border-t border-[var(--border)]">
          {/* Stylization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Palette className="w-4 h-4 text-purple-400" />
                Stylization
                <span className="text-[var(--muted)] font-normal">
                  ({settings.stylization})
                </span>
              </label>
              <button
                onClick={() => updateSetting('stylization', MJ_DEFAULT_SETTINGS.stylization)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Сброс
              </button>
            </div>
            <Slider
              value={[settings.stylization]}
              onValueChange={([val]) => updateSetting('stylization', val)}
              min={MJ_LIMITS.stylization.min}
              max={MJ_LIMITS.stylization.max}
              step={MJ_LIMITS.stylization.step}
              disabled={disabled}
              className="py-2"
            />
            <p className="text-xs text-[var(--muted)]">
              Влияет на художественность. Низкие значения = реалистичнее, высокие = более «MJ стиль»
            </p>
          </div>

          {/* Weirdness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Wand2 className="w-4 h-4 text-pink-400" />
                Weirdness
                <span className="text-[var(--muted)] font-normal">
                  ({settings.weirdness})
                </span>
              </label>
              <button
                onClick={() => updateSetting('weirdness', MJ_DEFAULT_SETTINGS.weirdness)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Сброс
              </button>
            </div>
            <Slider
              value={[settings.weirdness]}
              onValueChange={([val]) => updateSetting('weirdness', val)}
              min={MJ_LIMITS.weirdness.min}
              max={MJ_LIMITS.weirdness.max}
              step={MJ_LIMITS.weirdness.step}
              disabled={disabled}
              className="py-2"
            />
            <p className="text-xs text-[var(--muted)]">
              Добавляет необычные/сюрреалистичные элементы в изображение
            </p>
          </div>

          {/* Variety */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Shuffle className="w-4 h-4 text-cyan-400" />
                Variety
                <span className="text-[var(--muted)] font-normal">
                  ({settings.variety})
                </span>
              </label>
              <button
                onClick={() => updateSetting('variety', MJ_DEFAULT_SETTINGS.variety)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                Сброс
              </button>
            </div>
            <Slider
              value={[settings.variety]}
              onValueChange={([val]) => updateSetting('variety', val)}
              min={MJ_LIMITS.variety.min}
              max={MJ_LIMITS.variety.max}
              step={MJ_LIMITS.variety.step}
              disabled={disabled}
              className="py-2"
            />
            <p className="text-xs text-[var(--muted)]">
              Увеличивает разнообразие между вариантами генерации
            </p>
          </div>

          {/* Translation toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface2)]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--text)]">
                Авто-перевод промпта
              </span>
            </div>
            <button
              onClick={() => updateSetting('enableTranslation', !settings.enableTranslation)}
              disabled={disabled}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${settings.enableTranslation ? 'bg-[var(--gold)]' : 'bg-[var(--border)]'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${settings.enableTranslation ? 'left-7' : 'left-1'}
                `}
              />
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
        <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--text)] mb-2">
          <Info className="w-4 h-4" />
          Советы по Midjourney
        </h4>
        <ul className="text-xs text-[var(--muted)] space-y-1">
          <li>• V7 — новейшая версия с лучшим качеством</li>
          <li>• Niji 6 — специализирована под аниме/манга стиль</li>
          <li>• Relaxed — экономит звёзды, но дольше ждать</li>
          <li>• Stylization 100 — баланс реализма и стиля MJ</li>
        </ul>
      </div>
    </div>
  );
}

// Default export for lazy loading
export default MidjourneySettings;


