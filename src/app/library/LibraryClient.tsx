"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, X, Globe, Download, RefreshCw, Heart, Repeat, Edit3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectWebView, openExternal } from "@/lib/telegram/webview";
import { invalidateCached } from "@/lib/client/generations-cache";
import { useFavoritesStore } from "@/stores/favorites-store";
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

// Estimated generation times by type (seconds)
const ESTIMATED_TIMES = {
  photo: { min: 10, max: 30 },
  video: { min: 60, max: 180 },
};

export function LibraryClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const [editPromptOpen, setEditPromptOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");

  const { favorites, toggleFavorite, isFavorite, fetchFavorites } = useFavoritesStore();
  
  // Safe favorites check (handle both Set and Array after hydration)
  const safeIsFavorite = useCallback((id: string): boolean => {
    try {
      if (!favorites) return false;
      if (favorites instanceof Set) {
        return favorites.has(id);
      }
      if (Array.isArray(favorites)) {
        const arr = favorites as string[];
        return arr.includes(id);
      }
      return false;
    } catch {
      return false;
    }
  }, [favorites]);

  const prevStatusRef = useRef<Record<string, UiStatus>>({});
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const isWebView = useMemo(() => detectWebView(), []);

  const LIMIT = 24;

  // Fetch favorites on mount
  useEffect(() => {
    try {
      fetchFavorites();
    } catch (error) {
      console.error('[Library] Error fetching favorites:', error);
      // Не критично, продолжаем работу
    }
  }, [fetchFavorites]);

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
      
      let json: any = null;
      try {
        const text = await res.text();
        if (text) {
          json = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('[Library] Failed to parse response:', parseError);
        throw new Error('Неверный формат ответа от сервера');
      }
      
      if (!res.ok) {
        const errorMsg = json?.error || `Ошибка загрузки (${res.status})`;
        console.error('[Library] API error:', errorMsg, json);
        throw new Error(errorMsg);
      }

      // Parse new API format: { items: [...], count, meta }
      const newItems: LibraryItem[] = Array.isArray(json?.items) ? json.items : [];
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[library] Received", newItems.length, "items");
      }

      // Валидация и нормализация данных
      const validatedItems = newItems.map((item: any) => ({
        id: String(item?.id || ''),
        user_id: String(item?.user_id || ''),
        type: String(item?.type || 'photo'),
        status: String(item?.status || 'queued'),
        created_at: item?.created_at || new Date().toISOString(),
        updated_at: item?.updated_at || null,
        prompt: item?.prompt || null,
        model_name: item?.model_name || null,
        preview_status: item?.preview_status || 'none',
        originalUrl: item?.originalUrl || null,
        previewUrl: item?.previewUrl || null,
        posterUrl: item?.posterUrl || null,
        displayUrl: item?.displayUrl || null,
      }));

      setItems((prev) => (append ? [...prev, ...validatedItems] : validatedItems));
      setHasMore(json?.meta?.hasMore || validatedItems.length === LIMIT);
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

  // Build grid items with filter
  const grid = useMemo(() => {
    try {
      let filtered = items;
      
      // Apply favorites filter
      if (filter === 'favorites') {
        filtered = items.filter(item => {
          try {
            if (!favorites) return false;
            if (favorites instanceof Set) {
              return favorites.has(item.id);
            }
            if (Array.isArray(favorites)) {
              const arr = favorites as string[];
              return arr.includes(item.id);
            }
            return false;
          } catch {
            return false;
          }
        });
      }
      
      return filtered.map((item) => {
        try {
          const st = normalizeStatus(item?.status);
          const isVideo = String(item?.type || "").toLowerCase() === "video";
          const ageSeconds = getAgeSeconds(item?.created_at || new Date().toISOString());
          const needsPreview = st === "success" && item?.preview_status !== "ready";
          const progress = st === "generating" || st === "queued" 
            ? calculateProgress(item?.created_at || new Date().toISOString(), item?.type || 'photo') 
            : 0;
          const timeRemaining = st === "generating" || st === "queued"
            ? formatTimeRemaining(item?.created_at || new Date().toISOString(), item?.type || 'photo')
            : null;
          return { item, st, isVideo, ageSeconds, needsPreview, progress, timeRemaining };
        } catch (itemError) {
          console.error('[Library] Error processing item:', item?.id, itemError);
          // Возвращаем безопасный fallback
          return {
            item,
            st: 'failed' as UiStatus,
            isVideo: false,
            ageSeconds: 0,
            needsPreview: false,
            progress: 0,
            timeRemaining: null,
          };
        }
      });
    } catch (error) {
      console.error('[Library] Error building grid:', error);
      return [];
    }
  }, [items, filter, favorites, safeIsFavorite]);

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
    try {
      const prev = prevStatusRef.current || {};
      const next: Record<string, UiStatus> = {};
      
      for (const { item, st } of grid) {
        try {
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
        } catch (itemError) {
          console.error('[Library] Error in status transition:', itemError);
        }
      }
      prevStatusRef.current = next;
    } catch (error) {
      console.error('[Library] Error in toast effect:', error);
    }
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

  // Navigate to create page with same settings
  const handleRegenerateSimilar = (item: LibraryItem) => {
    const isVideo = String(item.type || "").toLowerCase() === "video";
    const params = new URLSearchParams();
    
    if (item.prompt) {
      params.set("prompt", item.prompt);
    }
    if (item.model_name) {
      params.set("model", item.model_name);
    }
    
    const path = isVideo ? "/create/video" : "/create";
    router.push(`${path}?${params.toString()}`);
    toast.success("Настройки применены! Можете редактировать промпт.");
  };

  // Open edit prompt dialog
  const handleEditPrompt = (item: LibraryItem) => {
    setEditedPrompt(item.prompt || "");
    setEditPromptOpen(true);
  };

  // Navigate to create with edited prompt
  const handleRegenerateWithNewPrompt = () => {
    if (!selected || !editedPrompt.trim()) return;
    
    const isVideo = String(selected.type || "").toLowerCase() === "video";
    const params = new URLSearchParams();
    params.set("prompt", editedPrompt.trim());
    if (selected.model_name) {
      params.set("model", selected.model_name);
    }
    
    const path = isVideo ? "/create/video" : "/create";
    router.push(`${path}?${params.toString()}`);
    setEditPromptOpen(false);
    setOpen(false);
    toast.success("Создайте новую генерацию с изменённым промптом!");
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    try {
      e?.stopPropagation();
      const wasFavorite = safeIsFavorite(id);
      await toggleFavorite(id);
      // Небольшая задержка чтобы store обновился
      setTimeout(() => {
        const nowFavorite = safeIsFavorite(id);
        toast.success(nowFavorite ? "Добавлено в избранное" : "Удалено из избранного");
      }, 100);
    } catch (error) {
      console.error('[Library] Error toggling favorite:', error);
      toast.error('Ошибка при изменении избранного');
    }
  };

  // Format estimated time remaining
  const formatTimeRemaining = (createdAt: string, type: string): string => {
    try {
      if (!createdAt) return "Скоро...";
      const ageSeconds = getAgeSeconds(createdAt);
      const isVideo = type?.toLowerCase() === "video";
      const { min, max } = isVideo ? ESTIMATED_TIMES.video : ESTIMATED_TIMES.photo;
      
      const avgTime = (min + max) / 2;
      const remaining = Math.max(0, avgTime - ageSeconds);
      
      if (remaining <= 0) return "Скоро...";
      if (remaining < 60) return `~${Math.ceil(remaining)} сек`;
      return `~${Math.ceil(remaining / 60)} мин`;
    } catch {
      return "Скоро...";
    }
  };

  // Calculate progress percentage based on time
  const calculateProgress = (createdAt: string, type: string): number => {
    try {
      if (!createdAt) return 0;
      const ageSeconds = getAgeSeconds(createdAt);
      const isVideo = type?.toLowerCase() === "video";
      const { min, max } = isVideo ? ESTIMATED_TIMES.video : ESTIMATED_TIMES.photo;
      
      const avgTime = (min + max) / 2;
      const progress = Math.min(95, (ageSeconds / avgTime) * 100);
      return Math.round(progress);
    } catch {
      return 0;
    }
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
    try {
      if (!item) return null;
      if (isVideo) {
        // Video: show poster if available
        return item.posterUrl || null;
      } else {
        // Photo: show preview if available, else original
        return item.previewUrl || item.originalUrl || null;
      }
    } catch (error) {
      console.error('[Library] Error getting display URL:', error);
      return null;
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
          <div className="flex gap-2">
            {/* Filter tabs */}
            <div className="flex bg-[var(--surface)] rounded-xl p-1 border border-[var(--border)]">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filter === 'all' 
                    ? 'bg-white text-black font-medium' 
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                  filter === 'favorites' 
                    ? 'bg-white text-black font-medium' 
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Избранное
              </button>
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
              {grid.map(({ item, st, isVideo, needsPreview, progress, timeRemaining }) => {
                if (!item || !item.id) {
                  console.warn('[Library] Skipping invalid item:', item);
                  return null;
                }
                
                try {
                  const hasError = imageError.has(String(item.id));
                  const displayUrl = getCardDisplayUrl(item, isVideo);
                  const canDisplay = !!displayUrl && !hasError;
                  const isFav = safeIsFavorite(item.id);
                  
                  // Determine if we should show the card as "ready"
                  const hasContent = st === "success" && (item.originalUrl || item.previewUrl || item.posterUrl);

                  return (
                  <div key={String(item.id)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden group">
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
                        // Video without poster
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
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white/40" />
                            <div className="text-xs text-white/60">Загрузка...</div>
                          </div>
                        </div>
                      ) : st === "generating" || st === "queued" ? (
                        // Enhanced generating state with progress
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                          <div className="text-center px-4">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-white/60" />
                            <div className="text-sm text-white/80 mb-2">
                              {st === "queued" ? "В очереди..." : "Генерация..."}
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                              <div 
                                className="h-full bg-[var(--gold)] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            {/* Time remaining */}
                            {timeRemaining && (
                              <div className="flex items-center justify-center gap-1 text-xs text-white/50">
                                <Clock className="w-3 h-3" />
                                {timeRemaining}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                          {hasError ? "Ошибка загрузки" : st === "failed" ? "Ошибка генерации" : "—"}
                        </div>
                      )}
                      
                      {/* Status badge */}
                      <div className="absolute top-3 left-3">
                        <Badge variant={statusBadgeVariant(st)}>{st}</Badge>
                      </div>
                      
                      {/* Favorite button (always visible on hover) */}
                      {st === "success" && (
                        <button
                          onClick={(e) => handleToggleFavorite(item.id, e)}
                          className={`absolute top-3 right-3 p-2 rounded-xl transition-all ${
                            isFav 
                              ? 'bg-red-500/90 text-white' 
                              : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white'
                          }`}
                          title={isFav ? "Убрать из избранного" : "Добавить в избранное"}
                        >
                          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      )}
                      
                      {/* Preview status indicator */}
                      {st === "success" && needsPreview && !isFav && (
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
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerateSimilar(item)}
                              title="Сгенерировать похожее"
                            >
                              <Repeat className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(item.id, 'original')}
                              title="Скачать"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                } catch (cardError) {
                  console.error('[Library] Error rendering card:', item?.id, cardError);
                  return (
                    <div key={String(item?.id || Math.random())} className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                      <div className="text-xs text-red-400">Ошибка отображения</div>
                    </div>
                  );
                }
              }).filter(Boolean)}
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
                {/* Favorite button */}
                <button
                  className={`p-2 rounded-xl transition-colors ${
                    safeIsFavorite(selected.id) 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                  onClick={() => handleToggleFavorite(selected.id)}
                  title={safeIsFavorite(selected.id) ? "Убрать из избранного" : "Добавить в избранное"}
                >
                  <Heart className={`w-5 h-5 ${safeIsFavorite(selected.id) ? 'fill-current' : ''}`} />
                </button>
                {/* Regenerate similar */}
                <button
                  className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  onClick={() => handleRegenerateSimilar(selected)}
                  title="Сгенерировать похожее"
                >
                  <Repeat className="w-5 h-5" />
                </button>
                {/* Edit and regenerate */}
                <button
                  className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  onClick={() => handleEditPrompt(selected)}
                  title="Редактировать и пересоздать"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                {selected.originalUrl && (
                  <button
                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleDownload(selected.id, 'original')}
                    title="Скачать оригинал"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
                {isWebView && selected.originalUrl && (
                  <button
                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleOpenExternal(selected.originalUrl!)}
                    title="Открыть в браузере"
                  >
                    <Globe className="w-5 h-5" />
                  </button>
                )}
                <button
                  className="p-2 rounded-xl hover:bg-white/5"
                  onClick={() => setOpen(false)}
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
            
            {/* Prompt section */}
            {selected.prompt && (
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] mb-1">Промпт:</p>
                <p className="text-sm text-[var(--text)]">{selected.prompt}</p>
              </div>
            )}
            
            {/* WebView fallback */}
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

      {/* Edit Prompt Modal */}
      {editPromptOpen && selected && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setEditPromptOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text)]">Редактировать промпт</h3>
              <button
                className="p-2 rounded-xl hover:bg-white/5"
                onClick={() => setEditPromptOpen(false)}
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full h-32 p-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:border-[var(--gold)]/50"
                placeholder="Введите новый промпт..."
              />
              <div className="mt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setEditPromptOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleRegenerateWithNewPrompt}
                  disabled={!editedPrompt.trim()}
                  className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Создать
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

