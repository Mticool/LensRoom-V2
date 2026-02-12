"use client";

import { cn } from "@/lib/utils";
import type { Mode } from "@/config/studioModels";

export function PromptBox({
  mode,
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  scenes,
  onScenesChange,
}: {
  mode: Mode;
  prompt: string;
  onPromptChange: (v: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (v: string) => void;
  scenes: string[];
  onScenesChange: (v: string[]) => void;
}) {
  const isStoryboard = mode === "storyboard";

  return (
    <div
      className={cn(
        "relative rounded-[16px] border bg-[var(--surface)] overflow-hidden",
        "border-[var(--border-hover)] hover:border-[var(--muted)]/30",
        "focus-within:border-[var(--accent-primary)]/50 focus-within:shadow-[0_0_0_1px_rgba(205,255,0,0.15),0_8px_32px_rgba(0,0,0,0.25)]",
        "shadow-[var(--shadow-md)] transition-all duration-300"
      )}
    >
      {/* Higgsfield-style subtle cyan glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/6 via-transparent to-[var(--accent-secondary)]/4 opacity-80" />
      
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold text-[var(--text)]">{isStoryboard ? "Сцены" : "Промпт"}</div>
        <div className="text-xs text-[var(--muted)] mt-1">
          {isStoryboard
            ? "Минимальная заглушка: 3 сцены, каждая со своим описанием"
            : "Опишите результат максимально конкретно (RU)"}
        </div>
      </div>

      <div className="relative z-10 p-5">
        {isStoryboard ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx}>
                <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Сцена {idx + 1}</div>
                <textarea
                  value={scenes[idx] || ""}
                  onChange={(e) => {
                    const next = [...scenes];
                    next[idx] = e.target.value;
                    onScenesChange(next);
                  }}
                  placeholder={`Коротко опишите сцену ${idx + 1}…`}
                  rows={3}
                  className={cn(
                    "w-full rounded-[12px] border bg-[var(--surface2)] px-4 py-3 text-sm",
                    "border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none",
                    "focus:border-[var(--accent-primary)]/50 focus:shadow-[0_0_0_1px_rgba(205,255,0,0.12)] transition-all duration-200"
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Промпт</div>
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Например: студийная предметная съемка, мягкий свет, минимализм, очень высокая детализация…"
                rows={5}
                className={cn(
                  "w-full rounded-[12px] border bg-[var(--surface2)] px-4 py-3 text-sm",
                  "border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none",
                  "focus:border-[var(--accent-primary)]/50 focus:shadow-[0_0_0_1px_rgba(140,244,37,0.12)] transition-all duration-200"
                )}
              />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-2">Негативный промпт (опционально)</div>
              <textarea
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange(e.target.value)}
                placeholder="Например: blur, artifacts, low quality, extra fingers…"
                rows={2}
                className={cn(
                  "w-full rounded-[12px] border bg-[var(--surface2)] px-4 py-3 text-sm",
                  "border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none",
                  "focus:border-[var(--accent-primary)]/50 focus:shadow-[0_0_0_1px_rgba(140,244,37,0.12)] transition-all duration-200"
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
