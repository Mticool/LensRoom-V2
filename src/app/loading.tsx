'use client';

/**
 * Показывается пока загружаются чанки главной страницы.
 * Минимальная разметка — не тянет лишние зависимости, чтобы не усугублять загрузку.
 */
export default function Loading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#0a0a0b]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-[#8cf425]/30 border-t-[#8cf425] animate-spin"
          aria-hidden
        />
        <p className="text-sm text-white/60">Загрузка…</p>
        <p className="text-xs text-white/40 max-w-[260px] text-center">
          Если страница не появилась — обновите (Ctrl+F5 или Cmd+Shift+R)
        </p>
      </div>
    </div>
  );
}
