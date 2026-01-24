"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, ExternalLink, X, Globe, Download, RefreshCw, Heart, Repeat, 
  Edit3, Clock, Upload, Home, Lightbulb, Check, Plus, Image, Video,
  Sparkles, Filter, Grid3X3, LayoutGrid, Star, FolderOpen, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { detectWebView, openExternal } from "@/lib/telegram/webview";
import { invalidateCached } from "@/lib/client/generations-cache";
import { useFavoritesStore } from "@/stores/favorites-store";
import { toast } from "sonner";
import { getModelById } from "@/config/models";
import { NoGenerationsEmpty } from "@/components/ui/empty-state";
import { GenerationGridSkeleton } from "@/components/ui/skeleton";
import {
  type LibraryItem,
  type UiStatus,
  normalizeStatus
} from "@/lib/validation/library";
import { handleError } from "@/lib/errors/error-handler";

function getAgeSeconds(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
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
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video' | 'favorites'>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const [editPromptOpen, setEditPromptOpen] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");

  // Admin features
  const [userRole, setUserRole] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishItem, setPublishItem] = useState<LibraryItem | null>(null);
  const [publishToHome, setPublishToHome] = useState(true);
  const [publishToInspiration, setPublishToInspiration] = useState(false);
  const [publishCategory, setPublishCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
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
  const isWebView = useMemo(() => detectWebView(), []);
  const LIMIT = 24;

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
          if (data.role === "admin" || data.role === "manager") {
            loadCategories();
          }
        }
      } catch (error) {
        handleError(error, 'Library - checkRole');
      }
    };
    checkRole();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) setCategories(data.categories);
      }
    } catch (error) {
      handleError(error, 'Library - loadCategories');
    }
  };

  const fetchGenerations = useCallback(async (offset = 0, append = false, silent = false) => {
    try {
      if (!silent) {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);
      }
      setError(null);

      const res = await fetch(`/api/library?limit=${LIMIT}&offset=${offset}&_t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'include'
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Ошибка загрузки (${res.status})`);

      const newItems: LibraryItem[] = Array.isArray(json?.items) ? json.items : [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setHasMore(json?.meta?.hasMore || newItems.length === LIMIT);
      lastFetchRef.current = Date.now();
    } catch (error) {
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
      const progress = (st === "generating" || st === "queued") ? calculateProgress(item?.created_at || '', item?.type || 'photo') : 0;
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

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchGenerations(items.length, true);
  };

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleFavorite(id);
    toast.success(safeIsFavorite(id) ? "Удалено из избранного" : "Добавлено в избранное");
  };

  const handleDownload = async (id: string) => {
    const link = document.createElement('a');
    link.href = `/api/generations/${id}/download?kind=original`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Скачивание началось');
  };

  const handleRegenerateSimilar = (item: LibraryItem) => {
    const type = item.type?.toLowerCase();
    
    if (type === "video") {
      // Use generationId for full parameter restoration
      router.push(`/generators?generationId=${item.id}`);
    } else if (type === "audio") {
      // Audio doesn't support parameter restoration yet
      router.push(`/create/studio?section=audio`);
      toast.info("Откройте аудио-генератор");
      return;
    } else {
      // For photos - keep old behavior
      const params = new URLSearchParams();
      if (item.prompt) params.set("prompt", item.prompt);
      if (item.model_name) params.set("model", item.model_name);
      router.push(`/create/studio?${params.toString()}`);
    }
    toast.success("Открываю в генераторе...");
  };

  const handleOpenInGenerator = (item: LibraryItem) => {
    const type = item.type?.toLowerCase();
    
    if (type === "video") {
      router.push(`/generators?generationId=${item.id}`);
    } else if (type === "audio") {
      // Audio doesn't support parameter restoration yet
      router.push(`/create/studio?section=audio`);
      toast.info("Откройте аудио-генератор");
      return;
    } else {
      // Photos
      const params = new URLSearchParams();
      if (item.prompt) params.set("prompt", item.prompt);
      if (item.model_name) params.set("model", item.model_name);
      router.push(`/create/studio?${params.toString()}`);
    }
    toast.success("Открываю в генераторе...");
  };

  const calculateProgress = (createdAt: string, type: string): number => {
    if (!createdAt) return 0;
    const ageSeconds = getAgeSeconds(createdAt);
    const { min, max } = type?.toLowerCase() === "video" ? ESTIMATED_TIMES.video : ESTIMATED_TIMES.photo;
    return Math.min(95, Math.round((ageSeconds / ((min + max) / 2)) * 100));
  };

  const getDisplayUrl = (item: LibraryItem, isVideo: boolean): string | null => {
    if (isVideo) return item.posterUrl || null;
    return item.previewUrl || item.originalUrl || null;
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
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-16">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
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
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              }`}
            >
              {grid.map(({ item, st, isVideo, needsPreview, progress }, i) => {
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
                    className="group rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden hover:border-[var(--gold)]/30 transition-all"
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

                      {/* Favorite button */}
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
                          isFav
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {/* Hover overlay */}
                      {hasContent && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelected(item); setOpen(true); }}
                            className="p-2 rounded-lg bg-white text-black hover:bg-white/90"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(item.id)}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRegenerateSimilar(item)}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenInGenerator(item)}
                            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                            title="Открыть в генераторе"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {isAdminOrManager && (
                            <button
                              onClick={() => handleOpenPublish(item)}
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
                      <p className="text-xs font-medium text-[var(--text)] truncate">{item.model_name || "—"}</p>
                      <p className="text-[10px] text-[var(--muted)] truncate mt-0.5">{item.prompt || ""}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                </Button>
              </div>
            )}
          </>
        )}
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
                  <button onClick={() => handleRegenerateSimilar(selected)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
                    <Repeat className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDownload(selected.id)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleOpenInGenerator(selected)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5" title="Открыть в генераторе">
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-[var(--muted)] hover:bg-white/5">
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
                  <img
                    src={selected.originalUrl || selected.previewUrl || ""}
                    alt=""
                    className="max-w-full max-h-[60vh] object-contain"
                  />
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
    </div>
  );
}
