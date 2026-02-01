'use client';

import { MessageSquare, Music, ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClonedVoice {
  id: string;
  name: string;
  is_cloned?: boolean;
  is_default?: boolean;
  created_at?: string;
}

interface AudioGenerateCardProps {
  clonedVoices: ClonedVoice[];
  selectedVoice: string;
  prompt: string;
  language: 'ru' | 'en' | 'mix';
  onVoiceChange: (voiceId: string) => void;
  onPromptChange: (prompt: string) => void;
  onLanguageChange: (language: 'ru' | 'en' | 'mix') => void;
}

const DEFAULT_VOICES: ClonedVoice[] = [];

const DURATION_OPTIONS = [
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '60 сек' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'mix', label: 'Mix' },
];

export function AudioGenerateCard({
  clonedVoices,
  selectedVoice,
  prompt,
  language,
  onVoiceChange,
  onPromptChange,
  onLanguageChange,
}: AudioGenerateCardProps) {
  const allVoices = [...DEFAULT_VOICES, ...clonedVoices];

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-xs font-bold">
            2
          </span>
          <h3 className="text-lg font-semibold text-[var(--text)]">Сгенерируй речь или трек</h3>
        </div>
        <p className="text-sm text-[var(--muted)] ml-8">
          Выбери голос и опиши что хочешь создать
        </p>
      </div>

      {/* Voice Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Выбери голос
        </label>
        <div className="relative">
          <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full appearance-none px-4 py-3 pr-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer"
          >
            {allVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.is_cloned ? '🧬 ' : ''}{voice.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)] pointer-events-none" />
        </div>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Текст для озвучки
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Напиши текст, который нужно озвучить..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] transition-colors resize-none"
        />
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[var(--text)]">Параметры</h4>
        
        {/* Language selector */}
        <div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5">
              Язык/акцент
            </label>
            <div className="flex gap-1.5">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onLanguageChange(opt.value as 'ru' | 'en' | 'mix')}
                  className={cn(
                    "flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all active:scale-95",
                    language === opt.value
                      ? "bg-[var(--gold)] text-black"
                      : "bg-[var(--bg)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              💡 Стоимость: 1 секунда аудио = 1⭐ (списание после генерации)
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
        <Info className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--muted)]">
          Не загружайте голоса без прав. Используйте только свои или разрешённые записи.
        </p>
      </div>
    </div>
  );
}
