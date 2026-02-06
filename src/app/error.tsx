'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isChunkLoadError, reloadWithCacheBypass, tryChunkErrorReload } from '@/lib/chunk-error';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error:', error);
    if (typeof window !== 'undefined' && isChunkLoadError(error)) {
      tryChunkErrorReload();
    }
  }, [error]);

  const chunkError = isChunkLoadError(error);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--text)]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Что-то пошло не так</h1>
        <p className="text-[var(--muted)] mb-4">
          {chunkError
            ? 'Не удалось загрузить часть страницы (часто из‑за кэша или сети). Нажмите «Обновить страницу».'
            : 'Произошла ошибка. Попробуйте обновить страницу.'}
        </p>
        {error.message && (
          <p className="text-sm text-[var(--muted)] bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 mb-6 font-mono break-words">
            {error.message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={chunkError ? reloadWithCacheBypass : reset}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {chunkError ? 'Обновить страницу' : 'Попробовать снова'}
          </Button>
          {!chunkError && (
            <Button onClick={reloadWithCacheBypass} className="gap-2">
              Обновить страницу
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
