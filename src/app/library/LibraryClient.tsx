/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, ExternalLink, X, Download, RefreshCw, Heart, Repeat, 
  Edit3, Upload, Home, Lightbulb, Image, Video,
  Sparkles, Grid3X3, LayoutGrid, FolderOpen, ArrowLeft, Search, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { invalidateCached } from "@/lib/client/generations-cache";
import { useFavoritesStore } from "@/stores/favorites-store";
import { toast } from "sonner";
import { getModelById } from "@/config/models";
import { NoGenerationsEmpty } from "@/components/ui/empty-state";
import { GenerationGridSkeleton } from "@/components/ui/skeleton";
import { LoginDialog } from "@/components/auth/login-dialog";
import { cn } from "@/lib/utils";
import {
  type LibraryItem,
  type UiStatus,
  normalizeStatus
} from "@/lib/validation/library";
import { handleError } from "@/lib/errors/error-handler";
import { navigateWithFallback } from "@/lib/client/navigate";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/api/fetch-with-timeout";

function getAgeSeconds(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
}

function calculateProgressPercent(createdAt: string, type: string): number {
  if (!createdAt) return 0;
  const ageSeconds = getAgeSeconds(createdAt);
  const { min, max } = String(type || "").toLowerCase() === "video" ? ESTIMATED_TIMES.video : ESTIMATED_TIMES.photo;
  return Math.min(95, Math.round((ageSeconds / ((min + max) / 2)) * 100));
}

const ESTIMATED_TIMES = {
  photo: { min: 10, max: 30 },
  video: { min: 60, max: 180 },
};

export function LibraryClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video' | 'favorites'>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  // Admin features
  const [userRole, setUserRole] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishItem, setPublishItem] = useState<LibraryItem | null>(null);
  const [publishToHome, setPublishToHome] = useState(true);
  const [publishToInspiration, setPublishToInspiration] = useState(false);
  const [publishCategory, setPublishCategory] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDescription, setPublishDescription] = useState("");

  const { favorites, toggleFavorite, fetchFavorites } = useFavoritesStore();
  const isAdminOrManager = userRole === "admin" || userRole === "manager";
  
  const safeIsFavorite = useCallback((id: string): boolean => {
    try {
      if (!favorites) return false;
      if (favorites instanceof Set) return favorites.has(id);
      if (Array.isArray(favorites)) return (favorites as string[]).includes(id);
      return false;
    } catch { return false; }
  }, [favorites]);

  const prevStatusRef = useRef<Record<string, UiStatus>>({});
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const LIMIT = 30; // Increased for better scrolling experience
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      fetchFavorites();
    } catch (error) {
      handleError(error, 'Library - fetchFavorites');
    }
  }, [fetchFavorites]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.role || "user");
          // categories list is not used in UI yet
        }
      } catch (error) {
        handleError(error, 'Library - checkRole');
      }
    };
    checkRole();
  }, []);

  const fetchGenerations = useCallback(async (offset = 0, append = false, silent = false) => {
    try {
      if (!silent) {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);
      }
      setError(null);
      setUnauthorized(false);

      const res = await fetchWithTimeout(`/api/library?limit=${LIMIT}&offset=${offset}&_t=${Date.now()}`, {
        timeout: 20_000,
        cache: 'no-store',
        credentials: 'include'
      });

      // Logged-out: show a friendly CTA instead of raw "Unauthorized".
      if (res.status === 401) {
        setUnauthorized(true);
        setItems([]);
        setHasMore(false);
        lastFetchRef.current = Date.now();
        return;
      }
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Ошибка загрузки (${res.status})`);

      const newItems: LibraryItem[] = Array.isArray(json?.items) ? json.items : [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setHasMore(json?.meta?.hasMore || newItems.length === LIMIT);
      lastFetchRef.current = Date.now();
    } catch (error) {
      if (error instanceof FetchTimeoutError) {
        if (!silent) setError("Сервер долго отвечает. Попробуйте обновить страницу.");
        return;
      }
      const errorMessage = handleError(error, 'Library - fetchGenerations');
      if (!silent) setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGenerations(0, false); }, [fetchGenerations]);

  // Allow other parts of the app (e.g. StudioRuntime) to trigger a one-shot refresh
  // so queued/generating items appear in Library immediately.
  useEffect(() => {
    const handler = () => {
      invalidateCached("generations:");
      fetchGenerations(0, false, true);
    };
    window.addEventListener("generations:refresh", handler as EventListener);
    return () => window.removeEventListener("generations:refresh", handler as EventListener);
  }, [fetchGenerations]);

  // Filter and build grid
  const grid = useMemo(() => {
    let filtered = items;
    if (filter === 'photo') filtered = items.filter(i => i.type?.toLowerCase() !== 'video');
    if (filter === 'video') filtered = items.filter(i => i.type?.toLowerCase() === 'video');
    if (filter === 'favorites') filtered = items.filter(i => safeIsFavorite(i.id));
    
    return filtered.map((item) => {
      const st = normalizeStatus(item?.status);
      const isVideo = item?.type?.toLowerCase() === "video";
      const needsPreview = st === "success" && item?.preview_status !== "ready";
      const progress = (st === "generating" || st === "queued") ? calculateProgressPercent(item?.created_at || '', item?.type || 'photo') : 0;
      return { item, st, isVideo, needsPreview, progress };
    });
  }, [items, filter, safeIsFavorite]);

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    photos: items.filter(i => i.type?.toLowerCase() !== 'video' && normalizeStatus(i.status) === 'success').length,
    videos: items.filter(i => i.type?.toLowerCase() === 'video' && normalizeStatus(i.status) === 'success').length,
    favorites: items.filter(i => safeIsFavorite(i.id)).length,
  }), [items, safeIsFavorite]);

  const selectedImageUrls = useMemo(() => {
    if (!selected) return [];
    if (Array.isArray(selected.resultUrls) && selected.resultUrls.length > 0) {
      return selected.resultUrls;
    }
    if (selected.originalUrl) return [selected.originalUrl];
    if (selected.previewUrl) return [selected.previewUrl];
    return [];
  }, [selected]);

  const activeImageUrl = selectedImageUrls[selectedIndex] || selectedImageUrls[0] || '';

  useEffect(() => {
    setSelectedIndex(0);
  }, [selected?.id]);

  // Polling
  const pollingConfig = useMemo(() => {
    let needsPolling = false;
    let interval = 30000;
    for (const { st, needsPreview, item } of grid) {
      const ageSeconds = getAgeSeconds(item?.created_at || '');
      if (st === "generating" || st === "queued") {
        needsPolling = true;
        interval = Math.min(interval, 5000);
      }
      if (needsPreview && ageSeconds < 120) {
        needsPolling = true;
        interval = Math.min(interval, 3000);
      } else if (needsPreview) {
        needsPolling = true;
        interval = Math.min(interval, 10000);
      }
    }
    return { needsPolling, interval };
  }, [grid]);

  useEffect(() => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (!pollingConfig.needsPolling || loading) return;
    pollingTimerRef.current = setInterval(() => {
      if (Date.now() - lastFetchRef.current > pollingConfig.interval * 0.8) {
        fetchGenerations(0, false, true);
      }
    }, pollingConfig.interval);
    return () => { if (pollingTimerRef.current) clearInterval(pollingTimerRef.current); };
  }, [pollingConfig, loading, fetchGenerations]);

  // Toast on success
  useEffect(() => {
    const prev = prevStatusRef.current || {};
    const next: Record<string, UiStatus> = {};
    for (const { item, st } of grid) {
      const id = String(item?.id || "");
      if (!id) continue;
      next[id] = st;
      if ((prev[id] === "generating" || prev[id] === "queued") && st === "success") {
        toast.success("Готово! 🎉", { description: item?.model_name || "Генерация завершена" });
      }
    }
    prevStatusRef.current = next;
  }, [grid]);

  const handleRefresh = () => {
    setRefreshing(true);
    invalidateCached("generations:");
    fetchGenerations(0, false);
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchGenerations(items.length, true);
  }, [loadingMore, hasMore, items.length, fetchGenerations]);
  
  // Optimized infinite scroll with Intersection Observer
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        rootMargin: '400px', // Start loading well before user reaches bottom
        threshold: 0,
      }
    );
    
    const trigger = loadMoreTriggerRef.current;
    if (trigger) {
      observer.observe(trigger);
    }
    
    return () => {
      if (trigger) {
        observer.unobserve(trigger);
      }
    };
  }, [hasMore, loadingMore, handleLoadMore]);

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleFavorite(id);
    toast.success(safeIsFavorite(id) ? "Удалено из избранного" : "Добавлено в избранное");
  };

  const handleDownload = async (id: string) => {
    // Use download=1 to force Content-Disposition: attachment (works on mobile)
    const downloadUrl = `/api/generations/${id}/download?kind=original&download=1`;

    // For mobile: use fetch + blob approach for reliable downloads
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        toast.loading('Подготовка файла...', { id: 'download' });
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `lensroom_${id.substring(0, 8)}.mp4`;

        // Extract filename from header if present
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }

        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        toast.success('Файл скачан!', { id: 'download' });
      } catch (error) {
        toast.error('Ошибка скачивания', { id: 'download' });
        console.error('[Download] Mobile download error:', error);
      }
    } else {
      // Desktop: simple link click with download attribute
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Скачивание началось');
    }
  };

  const handleRegenerateSimilar = (item: LibraryItem) => {
    const type = item.type?.toLowerCase();
    
    if (type === "video") {
      // Use generationId for full parameter restoration
      navigateWithFallback(router, `/create/studio?section=video&generationId=${encodeURIComponent(item.id)}`);
    } else if (type === "audio") {
      // Audio doesn't support parameter restoration yet
      navigateWithFallback(router, `/create/studio?section=music`);
      toast.info("Откройте аудио-генератор");
      return;
    } else {
      // For photos - keep old behavior
      const params = new URLSearchParams();
      if (item.prompt) params.set("prompt", item.prompt);
      if (item.model_name) params.set("model", item.model_name);
      navigateWithFallback(router, `/create/studio?${params.toString()}`);
    }
    toast.success("Открываю в генераторе...");
  };

  const handleOpenInGenerator = (item: LibraryItem) => {
    const type = item.type?.toLowerCase();
    
    if (type === "video") {
      navigateWithFallback(router, `/create/studio?section=video&generationId=${encodeURIComponent(item.id)}`);
    } else if (type === "audio") {
      // Audio doesn't support parameter restoration yet
      navigateWithFallback(router, `/create/studio?section=music`);
      toast.info("Откройте аудио-генератор");
      return;
    } else {
      // Photos
      const params = new URLSearchParams();
      if (item.prompt) params.set("prompt", item.prompt);
      if (item.model_name) params.set("model", item.model_name);
      navigateWithFallback(router, `/create/studio?${params.toString()}`);
    }
    toast.success("Открываю в генераторе...");
  };

  const getDisplayUrl = (item: LibraryItem, isVideo: boolean): string | null => {
    if (isVideo) {
      // For videos: poster > preview > first frame of original video
      return item.posterUrl || item.previewUrl || item.originalUrl || null;
    }
    if (item.previewUrl || item.originalUrl) {
      return item.previewUrl || item.originalUrl || null;
    }
    if (Array.isArray(item.resultUrls) && item.resultUrls.length > 0) {
      return item.resultUrls[0];
    }
    return null;
  };

  // Publish handlers (kept minimal for brevity)
  const handleOpenPublish = (item: LibraryItem) => {
    setPublishItem(item);
    setPublishToHome(true);
    setPublishToInspiration(false);
    setPublishCategory("");
    setPublishModalOpen(true);
  };

  const handlePublishToGallery = async () => {
    if (!publishItem || (!publishToHome && !publishToInspiration)) return;
    setIsPublishing(true);
    try {
      const modelInfo = getModelById(publishItem.model_name || "");
      const placements = [];
      if (publishToHome) placements.push("home");
      if (publishToInspiration) placements.push("inspiration");
      const isVideo = publishItem.type?.toLowerCase() === "video";

      for (const placement of placements) {
        await fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            presetId: `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: publishDescription.trim() || `Создано с ${modelInfo?.name || publishItem.model_name}`,
            contentType: isVideo ? "video" : "photo",
            modelKey: publishItem.model_name || "",
            previewImage: publishItem.originalUrl,
            previewUrl: publishItem.originalUrl,
            templatePrompt: publishItem.prompt,
            placement,
            status: "published",
            category: publishCategory || "",
          }),
        });
      }
      toast.success("Опубликовано!");
      setPublishModalOpen(false);
    } catch (error) {
      const errorMessage = handleError(error, 'Library - publishToGallery');
      toast.error(errorMessage);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-28 lg:pb-16">
      <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-8 relative">
        <div className="lg:hidden absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-[-8%] left-[-18%] w-[64%] h-[28%] bg-[#8cf425]/10 rounded-full blur-[60px]" />
          <div className="absolute bottom-[12%] right-[-22%] w-[65%] h-[32%] bg-blue-700/15 rounded-full blur-[70px]" />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden relative z-10 mb-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/75"
              aria-label="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base font-semibold tracking-wide text-white/90">Мои работы</h1>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/75 disabled:opacity-50"
              aria-label="Поиск и обновление"
            >
              {refreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(12,14,18,0.88))] backdrop-blur-xl p-1.5">
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'all', label: 'Все' },
                { id: 'video', label: 'Видео' },
                { id: 'photo', label: 'Фото' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as typeof filter)}
                  className={cn(
                    'h-9 rounded-xl text-sm font-medium transition-colors',
                    filter === f.id ? 'bg-[#8cf425] text-black' : 'text-white/70'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 hidden lg:block"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                Мои результаты
              </h1>
              <p className="mt-2 text-[var(--muted)]">Все ваши фото и видео генерации</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Grid size toggle */}
              <div className="flex p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <button
                  onClick={() => setGridSize('small')}
                  className={`p-2 rounded-md transition-colors ${gridSize === 'small' ? 'bg-white text-black' : 'text-[var(--muted)]'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize('large')}
                  className={`p-2 rounded-md transition-colors ${gridSize === 'large' ? 'bg-white text-black' : 'text-[var(--muted)]'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="border-[var(--border)]"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Всего', value: stats.total, icon: Sparkles, color: 'text-[var(--gold)]' },
              { label: 'Фото', value: stats.photos, icon: Image, color: 'text-emerald-400' },
              { label: 'Видео', value: stats.videos, icon: Video, color: 'text-violet-400' },
              { label: 'Избранное', value: stats.favorites, icon: Heart, color: 'text-rose-400' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
              >
                <div className="flex items-center justify-between">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className={`text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
                <p className="text-[10px] sm:text-xs text-[var(--muted)] mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'Все', icon: Sparkles },
              { id: 'photo', label: 'Фото', icon: Image },
              { id: 'video', label: 'Видео', icon: Video },
              { id: 'favorites', label: 'Избранное', icon: Heart },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-[var(--gold)] text-black'
                    : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <GenerationGridSkeleton count={12} />
        ) : unauthorized ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center">
            <p className="text-[var(--text)] font-medium">Войдите, чтобы увидеть ваши результаты</p>
            <p className="text-[var(--muted)] mt-1">После входа здесь появятся ваши фото и видео генерации.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                onClick={() => setLoginOpen(true)}
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
              >
                Войти
              </Button>
              <Button variant="outline" onClick={handleRefresh} className="border-[var(--border)]">
                Обновить
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center">
            <p className="text-[var(--muted)]">{error}</p>
            <Button variant="link" onClick={handleRefresh} className="mt-2">Повторить</Button>
          </div>
        ) : grid.length === 0 ? (
          <NoGenerationsEmpty />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-3 ${
                gridSize === 'small'
                  ? 'grid-cols-2 lg:grid-cols-6 xl:grid-cols-7'
                  : 'grid-cols-2 lg:grid-cols-5'
              }`}
            >
              {grid.map(({ item, st, isVideo, progress }, i) => {
                const displayUrl = getDisplayUrl(item, isVideo);
                const hasError = imageError.has(item.id);
                const canDisplay = !!displayUrl && !hasError;
                const isFav = safeIsFavorite(item.id);
                const hasContent = st === "success" && (item.originalUrl || item.previewUrl);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group rounded-[18px] lg:rounded-xl bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(12,14,18,0.88))] lg:bg-[var(--surface)] border border-white/10 lg:border-[var(--border)] overflow-hidden shadow-[0_0_26px_-18px_rgba(140,244,37,0.45)] lg:shadow-none lg:hover:border-[var(--gold)]/30 transition-all"
                    onClick={() => {
                      if (!hasContent) return;
                      setSelected(item);
                      setSelectedIndex(0);
                      setOpen(true);
                    }}
                  >
                    <div className="relative aspect-square bg-black/20">
                      {canDisplay ? (
                        <img
                          src={displayUrl}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={() => setImageError(prev => new Set([...prev, item.id]))}
                        />
                      ) : st === "generating" || st === "queued" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--gold)]/10 to-violet-500/10 p-3">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)] mb-2" />
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--gold)] transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[10px] text-[var(--muted)] mt-2">
                            {st === "queued" ? "В очереди" : "Генерация..."}
                          </p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo ? <Video className="w-8 h-8 text-[var(--muted)]" /> : <Image className="w-8 h-8 text-[var(--muted)]" />}
                        </div>
                      )}

                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          isVideo ? 'bg-violet-500/90 text-white' : 'bg-emerald-500/90 text-white'
                        }`}>
                          {isVideo ? '🎬' : '🖼'}
                        </div>
                      </div>

                      {/* Multi-image count badge */}
                      {Array.isArray(item.resultUrls) && item.resultUrls.length > 1 && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-white">
                          +{item.resultUrls.length - 1}
                        </div>
                      )}

                      {/* Favorite button */}
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
                          isFav
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/50 text-white/70 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Hover overlay */}
                      {hasContent && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(item); setSelectedIndex(0); setOpen(true); }}
                            className="p-2 rounded-lg bg-white text-black hover:bg-white/90"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(item.id); }}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRegenerateSimilar(item); }}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenInGenerator(item); }}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                            title="Открыть в генераторе"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {isAdminOrManager && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenPublish(item); }}
                              className="p-2 rounded-lg bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <p className="text-xs font-medium text-white lg:text-[var(--text)] truncate">{item.model_name || "—"}</p>
                      <p className="text-[10px] text-white/45 lg:text-[var(--muted)] truncate mt-0.5">{item.prompt || ""}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="mt-8 flex justify-center py-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Загрузка...</span>
                  </div>
                ) : (
                  <Button variant="outline" onClick={handleLoadMore} className="border-[var(--border)]">
                    Загрузить ещё
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="lg:hidden fixed left-4 right-4 z-40" style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button
          onClick={() => navigateWithFallback(router, '/create/studio?section=video')}
          className="w-full h-12 rounded-2xl bg-[#8cf425] text-black hover:bg-[#9aff3f] font-semibold shadow-[0_12px_35px_-20px_rgba(140,244,37,0.95)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать
        </Button>
      </div>

      {/* Viewer Modal */}
      <AnimatePresence>
        {open && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    selected.type?.toLowerCase() === 'video' ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selected.type?.toLowerCase() === 'video' ? '🎬 Видео' : '🖼 Фото'}
                  </div>
                  <span className="text-sm font-medium text-[var(--text)]">{selected.model_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleFavorite(selected.id)} className={`p-2 rounded-lg ${safeIsFavorite(selected.id) ? 'text-rose-400' : 'text-[var(--muted)]'} hover:bg-white/5`}>
                    <Heart className={`w-5 h-5 ${safeIsFavorite(selected.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button aria-label="Пересоздать" onClick={() => handleRegenerateSimilar(selected)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
                    <Repeat className="w-5 h-5" />
                  </button>
                  <button aria-label="Скачать" onClick={() => handleDownload(selected.id)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
                    <Download className="w-5 h-5" />
                  </button>
                  <button aria-label="Открыть в генераторе" onClick={() => handleOpenInGenerator(selected)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5" title="Открыть в генераторе">
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button aria-label="Закрыть" onClick={() => setOpen(false)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4">
                {selected.type?.toLowerCase() === "video" ? (
                  <video
                    src={selected.originalUrl || undefined}
                    controls
                    playsInline
                    className="max-w-full max-h-[60vh]"
                    poster={selected.posterUrl || undefined}
                  />
                ) : (
                  <div className="w-full flex flex-col items-center gap-3">
                    <img
                      src={activeImageUrl}
                      alt=""
                      className="max-w-full max-h-[60vh] object-contain"
                    />
                    {selectedImageUrls.length > 1 && (
                      <div className="flex gap-2 flex-wrap justify-center">
                        {selectedImageUrls.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            onClick={() => setSelectedIndex(idx)}
                            className={`w-14 h-14 rounded-lg overflow-hidden border ${
                              idx === selectedIndex ? 'border-[var(--gold)]' : 'border-white/10'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prompt */}
              {selected.prompt && (
                <div className="px-4 py-3 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] mb-1">Промпт</p>
                  <p className="text-sm text-[var(--text)]">{selected.prompt}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {publishModalOpen && publishItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPublishModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-[var(--surface)] rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[var(--gold)]" />
                  Опубликовать
                </h3>
                <button onClick={() => setPublishModalOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5 text-[var(--muted)]" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  <img src={publishItem.originalUrl || publishItem.previewUrl || ""} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-2 block">Описание</label>
                  <textarea
                    value={publishDescription}
                    onChange={(e) => setPublishDescription(e.target.value)}
                    placeholder="Добавьте описание..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                    <input type="checkbox" checked={publishToHome} onChange={(e) => setPublishToHome(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
                    <Home className="w-4 h-4 text-[var(--gold)]" />
                    <span className="text-[var(--text)]">Главная</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                    <input type="checkbox" checked={publishToInspiration} onChange={(e) => setPublishToInspiration(e.target.checked)} className="w-5 h-5 accent-[var(--gold)]" />
                    <Lightbulb className="w-4 h-4 text-blue-400" />
                    <span className="text-[var(--text)]">Вдохновение</span>
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPublishModalOpen(false)}>Отмена</Button>
                  <Button
                    className="flex-1 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                    onClick={handlePublishToGallery}
                    disabled={isPublishing || (!publishToHome && !publishToInspiration)}
                  >
                    {isPublishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isPublishing ? "Публикация..." : "Опубликовать"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
