'use client';

import { Loader2, X } from 'lucide-react';

type StageState = 'done' | 'active' | 'pending';

type Stage = {
  id: string;
  title: string;
  state: StageState;
};

interface MobileGenerationProgressOverlayProps {
  progress: number;
  status: string;
  onCancel: () => void;
}

function buildStages(progress: number): Stage[] {
  const p = Math.max(0, Math.min(100, progress));
  const activeIndex =
    p <= 20 ? 0 :
    p <= 45 ? 1 :
    p <= 75 ? 2 :
    p <= 90 ? 3 : 4;

  const titles = [
    'Инициализация модели',
    'Анализ промпта',
    'Генерация кадров',
    'Апскейлинг (x2)',
    'Финальная обработка',
  ];

  return titles.map((title, index) => ({
    id: `stage-${index}`,
    title,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending',
  }));
}

function estimateSeconds(progress: number): number {
  const p = Math.max(0, Math.min(100, progress));
  if (p >= 100) return 0;
  const maxSec = 60;
  return Math.max(3, Math.round(((100 - p) / 100) * maxSec));
}

export function MobileGenerationProgressOverlay({
  progress,
  status,
  onCancel,
}: MobileGenerationProgressOverlayProps) {
  const normalizedProgress = Math.max(1, Math.min(99, Math.round(progress || 0)));
  const stages = buildStages(normalizedProgress);
  const etaSec = estimateSeconds(normalizedProgress);

  return (
    <div className="lg:hidden fixed inset-0 z-[80] bg-[#0A0A0A] text-white">
      <div className="absolute inset-0 opacity-35 pointer-events-none">
        <div className="absolute top-[-12%] left-[-8%] w-[58%] h-[45%] bg-[#8cf425]/12 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-14%] right-[-10%] w-[58%] h-[45%] bg-blue-900/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative h-full px-5 pt-6 pb-6 flex flex-col">
        <header className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full text-white/80 hover:bg-white/5"
            aria-label="Отменить генерацию"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-[11px] tracking-[0.25em] text-white/65 uppercase font-semibold">Generating</p>
          <div className="w-9" />
        </header>

        <div className="rounded-[28px] border border-[#8cf425]/25 bg-[linear-gradient(145deg,rgba(24,32,18,0.75),rgba(8,10,12,0.95))] p-6 shadow-[0_0_45px_-18px_rgba(140,244,37,0.6)]">
          <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="48" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="48"
                stroke="#8cf425"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${(normalizedProgress / 100) * 301.59} 301.59`}
                className="drop-shadow-[0_0_10px_rgba(140,244,37,0.65)]"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-5xl font-semibold leading-none">
                {normalizedProgress}
                <span className="text-2xl text-[#8cf425]">%</span>
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-[#8cf425]/80">
                {status === 'queued' ? 'Queued' : 'Rendering'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {stages.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3">
              <div
                className={[
                  'w-7 h-7 rounded-full border flex items-center justify-center shrink-0',
                  stage.state === 'done'
                    ? 'border-[#8cf425]/50 bg-[#8cf425]/25 text-[#8cf425]'
                    : stage.state === 'active'
                      ? 'border-[#8cf425]/40 bg-[#8cf425]/15 text-[#8cf425]'
                      : 'border-white/10 bg-white/[0.03] text-white/30',
                ].join(' ')}
              >
                {stage.state === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '•'}
              </div>

              <div
                className={[
                  'flex-1 rounded-full border px-4 py-2.5 text-sm',
                  stage.state === 'done'
                    ? 'border-white/15 bg-white/[0.04] text-white/80'
                    : stage.state === 'active'
                      ? 'border-[#8cf425]/25 bg-[#8cf425]/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/35',
                ].join(' ')}
              >
                {stage.title}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] backdrop-blur-xl hover:bg-white/5 text-sm font-bold tracking-[0.2em] uppercase"
          >
            Отменить
          </button>
          <p className="text-center text-[11px] text-white/35 mt-3">Estimated time: ~{etaSec}s</p>
        </div>
      </div>
    </div>
  );
}
