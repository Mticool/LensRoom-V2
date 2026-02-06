'use client';

import { useEffect } from 'react';
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS, isChunkLoadError, tryChunkErrorReload } from '@/lib/chunk-error';

const LAST_CLIENT_ERROR_KEY = 'lensroom_last_client_error';

function logClientError(payload: { message: string; stack?: string; url?: string; isChunkError?: boolean; source?: string }) {
  const { message, stack, url, isChunkError: chunk, source } = payload;
  const full = `[LensRoom Client Error] ${source || 'error'}: ${message}${stack ? '\n' + stack : ''}`;
  console.error(full);
  try {
    sessionStorage.setItem(LAST_CLIENT_ERROR_KEY, JSON.stringify({ ...payload, t: Date.now() }));
  } catch {
    // ignore
  }
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      stack,
      url: url || (typeof window !== 'undefined' ? window.location.href : ''),
      isChunkError: chunk ?? false,
      source: payload.source,
    }),
  }).catch(() => {});
}

/**
 * Listens for chunk load errors and ALL client errors (log to console + server for PM2).
 * One-time auto-reload on chunk errors within CHUNK_RELOAD_WINDOW_MS.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const r = event.reason;
      const msg = r && (typeof r === 'string' ? r : (r?.message ?? r?.error?.message));
      const stack = r && typeof r === 'object' && 'stack' in r ? String((r as Error).stack) : undefined;
      const err = msg ? new Error(String(msg)) : (r instanceof Error ? r : null);
      const isChunk = isChunkLoadError(err) || (r && (r as Error).name === 'ChunkLoadError');

      logClientError({
        message: msg ? String(msg) : String(r),
        stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        isChunkError: isChunk,
        source: 'unhandledrejection',
      });

      if (isChunk && tryChunkErrorReload()) {
        event.preventDefault();
      }
    };

    const onError = (event: ErrorEvent) => {
      const isScript = event.target && (event.target as HTMLElement).tagName === 'SCRIPT';
      const src = isScript ? ((event.target as HTMLScriptElement).src || '') + '' : '';
      const isChunkScript = isScript && src.includes('_next/static');

      logClientError({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        url: event.filename || (isScript ? src : window.location.href),
        isChunkError: Boolean(isChunkScript),
        source: isScript ? 'script' : 'error',
      });

      if (isChunkScript && tryChunkErrorReload()) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);

    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return null;
}

/** Clears reload flag after successful load so future chunk errors can trigger reload again. */
export function ChunkErrorRecoveryClear() {
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
