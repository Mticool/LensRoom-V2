'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VideoCreatePageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Video Create Page Error]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Ошибка загрузки генератора
        </h1>

        <p className="text-[var(--text2)] mb-6">
          Не удалось загрузить AI генератор видео. Попробуйте обновить страницу.
        </p>

        {error.message && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={reset}
            variant="default"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </Button>

          <Link href="/">
            <Button variant="secondary" className="gap-2">
              <Home className="w-4 h-4" />
              На главную
            </Button>
          </Link>
        </div>

        <p className="text-xs text-[var(--muted)] mt-6">
          Если проблема повторяется, попробуйте{' '}
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="text-[var(--gold)] hover:underline"
          >
            очистить кэш
          </button>
        </p>
      </div>
    </div>
  );
}
