"use client";

import { cn } from "@/lib/utils";
import type { Mode } from "@/config/studioModels";

export function PromptBox({
  mode,
  prompt,
  onPromptChange,
  scenes,
  onScenesChange,
}: {
  mode: Mode;
  prompt: string;
  onPromptChange: (v: string) => void;
  scenes: string[];
  onScenesChange: (v: string[]) => void;
}) {
  const isStoryboard = mode === "storyboard";

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">{isStoryboard ? "Сцены" : "Промпт"}</div>
        <div className="text-xs text-[var(--muted)] mt-1">
          {isStoryboard
            ? "Минимальная заглушка: 3 сцены, каждая со своим описанием"
            : "Опишите результат максимально конкретно (RU)"}
        </div>
      </div>

      <div className="p-5">
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
                    "w-full rounded-2xl border border-white/10 bg-[var(--surface2)] px-4 py-3 text-sm",
                    "text-[var(--text)] placeholder:text-white/40 outline-none",
                    "focus:border-white/25 transition-colors motion-reduce:transition-none"
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Например: студийная предметная съемка, мягкий свет, минимализм, очень высокая детализация…"
            rows={6}
            className={cn(
              "w-full rounded-2xl border border-white/10 bg-[var(--surface2)] px-4 py-3 text-sm",
              "text-[var(--text)] placeholder:text-white/40 outline-none",
              "focus:border-white/25 transition-colors motion-reduce:transition-none"
            )}
          />
        )}
      </div>
    </div>
  );
}
