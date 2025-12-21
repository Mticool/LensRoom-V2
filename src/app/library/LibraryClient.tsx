"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Loader2, ExternalLink, X, Globe, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectWebView, openExternal } from "@/lib/telegram/webview";
import { invalidateCached } from "@/lib/client/generations-cache";
import { toast } from "sonner";

/**
 * LibraryClient - INSTANT PREVIEWS VERSION
 * 
 * Key changes:
 * - Library is NEVER empty after success (show original immediately)
 * - Smart polling: 3-5 sec for first 2 min, then 30 sec
 * - Uses new API response format with originalUrl/previewUrl/posterUrl
 * - Photo: show previewUrl if available, else originalUrl
 * - Video: show posterUrl if available, else placeholder
 */

type LibraryItem = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at?: string;
  prompt?: string;
  model_name?: string;
  preview_status: "none" | "processing" | "ready" | "failed";
  // URLs from API (signed, TTL 60 min)
  originalUrl: string | null;  // Always present for success
  previewUrl: string | null;   // For photos (null if not ready)
  posterUrl: string | null;    // For videos (null if not ready)
  displayUrl: string | null;   // For grid display
};

type UiStatus = "queued" | "generating" | "success" | "failed";

function normalizeStatus(s: any): UiStatus {
  const v = String(s || "").toLowerCase();
  if (v === "success" || v === "completed" || v === "succeeded") return "success";
  if (v === "queued" || v === "waiting" || v === "queuing") return "queued";
  if (v === "generating" || v === "processing" || v === "pending") return "generating";
  return "failed";
}

function statusBadgeVariant(s: UiStatus): "default" | "success" | "error" | "outline" {
  if (s === "success") return "success";
  if (s === "failed") return "error";
  if (s === "queued") return "outline";
  return "default"; // generating
}

// Calculate time since creation in seconds
function getAgeSeconds(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
}

export function LibraryClient() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const prevStatusRef = useRef<Record<string, UiStatus>>({});
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const isWebView = useMemo(() => detectWebView(), []);

  const LIMIT = 24;

  // Fetch generations from API
  const fetchGenerations = useCallback(async (
    offset: number = 0, 
    append: boolean = false,
    silent: boolean = false
  ) => {
    try {
      const isFirstLoad = offset === 0;
      if (!silent) {
        if (isFirstLoad) setLoading(true);
        else setLoadingMore(true);
      }
      setError(null);

      const url = `/api/library?limit=${LIMIT}&offset=${offset}&_t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(url, { 
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });
      clearTimeout(timeout);
      
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to load (${res.status})`);

      // Parse new API format: { items: [...], count, meta }
      const newItems: LibraryItem[] = Array.isArray(json?.items) ? json.items : [];
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[library] Received", newItems.length, "items");
      }

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setHasMore(json?.meta?.hasMore || newItems.length === LIMIT);
      lastFetchRef.current = Date.now();
      
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGenerations(0, false);
  }, [fetchGenerations]);

  // Allow other parts of the app (Studio) to trigger refresh
  useEffect(() => {
    const onRefresh = (event: CustomEvent) => {
      invalidateCached("generations:");
      
      if (event?.detail?.newItem) {
        // Prepend new item immediately
        setItems((prev) => [event.detail.newItem, ...prev]);
      } else {
        // Full reload
        fetchGenerations(0, false);
      }
    };
    window.addEventListener("generations:refresh", onRefresh as any);
    return () => window.removeEventListener("generations:refresh", onRefresh as any);
  }, [fetchGenerations]);

  // Build grid items
  const grid = useMemo(() => {
    return items.map((item) => {
      const st = normalizeStatus(item.status);
      const isVideo = String(item?.type || "").toLowerCase() === "video";
      const ageSeconds = getAgeSeconds(item.created_at);
      const needsPreview = st === "success" && item.preview_status !== "ready";
      return { item, st, isVideo, ageSeconds, needsPreview };
    });
  }, [items]);

  // Determine if we need polling and at what interval
  const pollingConfig = useMemo(() => {
    const now = Date.now();
    let needsPolling = false;
    let interval = 30000; // Default: 30 sec

    for (const { item, st, needsPreview, ageSeconds } of grid) {
      // Check for active jobs (generating/queued)
      if (st === "generating" || st === "queued") {
        needsPolling = true;
        interval = Math.min(interval, 5000); // 5 sec for active jobs
      }
      
      // Check for recent success without preview
      if (needsPreview && ageSeconds < 120) {
        // First 2 minutes: poll every 3 sec
        needsPolling = true;
        interval = Math.min(interval, 3000);
      } else if (needsPreview && ageSeconds < 600) {
        // 2-10 minutes: poll every 10 sec
        needsPolling = true;
        interval = Math.min(interval, 10000);
      } else if (needsPreview) {
        // After 10 minutes: poll every 30 sec
        needsPolling = true;
        interval = Math.min(interval, 30000);
      }
    }

    return { needsPolling, interval };
  }, [grid]);

  // Smart polling effect
  useEffect(() => {
    // Clear existing timer
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }

    if (!pollingConfig.needsPolling || loading) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[library] Polling active: interval=${pollingConfig.interval}ms`);
    }

    const poll = () => {
      // Only poll if not too recent (debounce)
      const timeSinceLast = Date.now() - lastFetchRef.current;
      if (timeSinceLast > pollingConfig.interval * 0.8) {
        fetchGenerations(0, false, true); // Silent refresh
      }
    };

    pollingTimerRef.current = setInterval(poll, pollingConfig.interval);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [pollingConfig, loading, fetchGenerations]);

  // Toast on generating -> success transitions
  useEffect(() => {
    const prev = prevStatusRef.current || {};
    const next: Record<string, UiStatus> = {};
    
    for (const { item, st } of grid) {
      const id = String(item?.id || "");
      if (!id) continue;
      next[id] = st;
      const was = prev[id];
      
      if ((was === "generating" || was === "queued") && st === "success") {
        toast.success("Готово! 🎉", {
          description: item?.model_name || "Генерация завершена",
          action: {
            label: "Открыть",
            onClick: () => {
              setSelected(item);
              setOpen(true);
            },
          },
        });
      }
    }
    prevStatusRef.current = next;
  }, [grid]);

  const handleOpenExternal = (url: string) => {
    if (isWebView) {
      openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGenerations(items.length, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    invalidateCached("generations:");
    fetchGenerations(0, false);
  };

  const handleImageError = (id: string) => {
    setImageError((prev) => new Set([...prev, id]));
  };

  const handleDownload = async (generationId: string, kind: 'original' | 'preview' | 'poster' = 'original') => {
    try {
      const downloadUrl = `/api/generations/${generationId}/download?kind=${kind}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Скачивание началось');
    } catch (error) {
      console.error('[Download] Error:', error);
      toast.error('Ошибка скачивания');
    }
  };

  // Get display URL for grid card
  const getCardDisplayUrl = (item: LibraryItem, isVideo: boolean): string | null => {
    if (isVideo) {
      // Video: show poster if available
      return item.posterUrl;
    } else {
      // Photo: show preview if available, else original
      return item.previewUrl || item.originalUrl;
    }
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 bg-[var(--bg)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text)]">Мои результаты</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">История фото и видео генераций</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Загрузка…</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
            {error}
            <Button variant="link" className="ml-2" onClick={handleRefresh}>
              Повторить
            </Button>
          </div>
        )}

        {!loading && !error && grid.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-8 text-center">
            <div className="text-sm text-[var(--muted)]">Пока нет результатов. Создайте первую генерацию.</div>
          </div>
        )}

        {!loading && !error && grid.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {grid.map(({ item, st, isVideo, needsPreview }) => {
                const hasError = imageError.has(String(item.id));
                const displayUrl = getCardDisplayUrl(item, isVideo);
                const canDisplay = !!displayUrl && !hasError;
                
                // Determine if we should show the card as "ready"
                // For photos: show if we have originalUrl (even without preview)
                // For videos: show placeholder if no poster yet
                const hasContent = st === "success" && (item.originalUrl || item.previewUrl || item.posterUrl);

                return (
                  <div key={String(item.id)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="relative aspect-square bg-black/20">
                      {canDisplay ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayUrl}
                          alt={item.prompt || ""}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(String(item.id))}
                        />
                      ) : isVideo && st === "success" ? (
                        // Video without poster: show placeholder
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <div className="text-center">
                            <div className="text-6xl mb-2">▶️</div>
                            <div className="text-sm font-medium text-white/90">Video</div>
                            {needsPreview && (
                              <div className="text-xs text-white/60 mt-2 animate-pulse">
                                Создаём постер...
                              </div>
                            )}
                          </div>
                        </div>
                      ) : st === "success" && !displayUrl ? (
                        // Photo without any URL (rare edge case)
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white/40" />
                            <div className="text-xs text-white/60">Загрузка...</div>
                          </div>
                        </div>
                      ) : st === "generating" || st === "queued" ? (
                        // Generating/queued state
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white/60" />
                            <div className="text-sm text-white/80">
                              {st === "queued" ? "В очереди..." : "Генерация..."}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Error or unknown state
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                          {hasError ? "Ошибка загрузки" : st === "failed" ? "Ошибка генерации" : "—"}
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="absolute top-3 left-3">
                        <Badge variant={statusBadgeVariant(st)}>{st}</Badge>
                      </div>
                      
                      {/* Preview status indicator */}
                      {st === "success" && needsPreview && (
                        <div className="absolute top-3 right-3">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Превью генерируется" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="text-sm font-semibold text-[var(--text)] truncate">{item.model_name || "—"}</div>
                      <div className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{item.prompt || ""}</div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!hasContent}
                          onClick={() => {
                            setSelected(item);
                            setOpen(true);
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Открыть
                        </Button>
                        {hasContent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(item.id, 'original')}
                            title="Скачать"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    "Загрузить ещё"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Viewer modal */}
      {open && selected && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text)] truncate">
                {selected.model_name || "Результат"}
              </div>
              <div className="flex items-center gap-2">
                {selected.originalUrl && (
                  <button
                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleDownload(selected.id, 'original')}
                    aria-label="Download original"
                    title="Скачать оригинал"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
                {isWebView && selected.originalUrl && (
                  <button
                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleOpenExternal(selected.originalUrl!)}
                    aria-label="Open in browser"
                    title="Открыть в браузере"
                  >
                    <Globe className="w-5 h-5" />
                  </button>
                )}
                <button
                  className="p-2 rounded-xl hover:bg-white/5"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 overflow-auto bg-black">
              {String(selected.type || "").toLowerCase() === "video" ? (
                <video
                  src={selected.originalUrl || undefined}
                  controls
                  playsInline
                  preload="auto"
                  className="w-full max-h-[60vh] bg-black"
                  poster={selected.posterUrl || undefined}
                  onError={() => {
                    const url = selected.originalUrl;
                    if (url && isWebView) {
                      openExternal(url);
                      setOpen(false);
                    }
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.originalUrl || selected.previewUrl || ""}
                  alt={selected.prompt || ""}
                  className="w-full max-h-[60vh] object-contain bg-black"
                  onError={() => {
                    const url = selected.originalUrl || selected.previewUrl;
                    if (url && isWebView) {
                      openExternal(url);
                      setOpen(false);
                    }
                  }}
                />
              )}
            </div>
            {/* Fallback message */}
            {isWebView && selected.originalUrl && (
              <div className="px-4 py-3 border-t border-[var(--border)] text-center">
                <button
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-2"
                  onClick={() => handleOpenExternal(selected.originalUrl!)}
                >
                  <Globe className="w-3 h-3" />
                  Не отображается? Открыть в браузере
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
