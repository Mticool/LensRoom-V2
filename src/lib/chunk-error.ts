/**
 * Chunk load error detection and safe recovery.
 * Used by ErrorBoundary, root error.tsx, and ChunkErrorHandler (layout).
 * No inline scripts — all logic in React to avoid hydration mismatch.
 */

export const CHUNK_RELOAD_KEY = 'chunk_err_reload';
export const CHUNK_RELOAD_WINDOW_MS = 60_000;

export function isChunkLoadError(error: Error | { message?: string } | null): boolean {
  if (!error?.message) return false;
  const msg = String(error.message).toLowerCase();
  return (
    msg.includes('failed to load chunk') ||
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror') ||
    msg.includes('loading css chunk') ||
    msg.includes('failed to fetch dynamically imported module') ||
    /chunk \d+ (failed|missing)/i.test(msg)
  );
}

/** Reload with cache-bust query so browser fetches fresh HTML and chunks. */
export function reloadWithCacheBypass(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  const sep = search ? '&' : '?';
  window.location.href = pathname + search + sep + '_=' + Date.now() + (hash || '');
}

/**
 * Safe one-time auto-reload on chunk error. Uses sessionStorage to avoid loops.
 * Uses cache-bypass so browser fetches fresh HTML and chunks (fixes 404/500 after deploy).
 */
export function tryChunkErrorReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (last && now - Number(last) < CHUNK_RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    reloadWithCacheBypass();
    return true;
  } catch {
    return false;
  }
}
