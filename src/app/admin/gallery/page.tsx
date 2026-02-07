"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { 
  Loader2, X, Home, Lightbulb, Trash2, Edit3, Star, Eye, EyeOff,
  GripVertical, RefreshCw, Plus, ArrowUpDown, Search, Filter,
  Image as ImageIcon, Video, Globe, Check, ChevronDown, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PublishedItem {
  id: string;
  preset_id: string;
  title: string;
  content_type: "photo" | "video";
  preview_url: string;
  preview_image: string;
  poster_url?: string;
  placement: "home" | "inspiration";
  category: string;
  status: "draft" | "published";
  featured: boolean;
  priority: number;
  display_order: number;
  cost_stars: number;
  created_at: string;
}

export default function AdminGalleryPage() {
  const router = useRouter();
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  
  // Filters
  const [filterPlacement, setFilterPlacement] = useState<"all" | "home" | "inspiration">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit modal
  const [editItem, setEditItem] = useState<PublishedItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);
  const [editPriority, setEditPriority] = useState(0);
  
  // Create/Upload modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createPlacement, setCreatePlacement] = useState<"home" | "inspiration">("home");
  const [createContentType, setCreateContentType] = useState<"photo" | "video">("photo");
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createModelKey, setCreateModelKey] = useState("nano-banana-pro");
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check access
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.role !== "admin" && data.role !== "manager") {
            router.push("/");
            return;
          }
          setUserRole(data.role);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };
    checkAccess();
  }, [router]);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery?limit=500", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.effects || []).map((e: any) => ({
          id: e.id,
          preset_id: e.preset_id,
          title: e.title || "",
          content_type: e.content_type || "photo",
          preview_url: e.preview_url || e.preview_image || "",
          preview_image: e.preview_image || "",
          poster_url: e.poster_url || "",
          placement: e.placement || "home",
          category: e.category || "",
          // Old rows may have `published` boolean without `status`.
          status: (e.status || (e.published === true ? "published" : "draft")) as any,
          featured: e.featured || false,
          priority: e.priority || 0,
          display_order: e.display_order || 0,
          cost_stars: e.cost_stars || 0,
          created_at: e.created_at,
        }));
        setItems(mapped);
      }
    } catch (e) {
      toast.error("Не удалось загрузить галерею");
    } finally {
      setLoading(false);
    }
  }, []);

  const runTempfileMigration = useCallback(async () => {
    if (migrating) return;
    setMigrating(true);
    try {
      const placement = filterPlacement !== "all" ? filterPlacement : null;
      const mkUrl = (dryRun: boolean, republish: boolean) => {
        const qs = new URLSearchParams();
        if (placement) qs.set("placement", placement);
        if (dryRun) qs.set("dryRun", "1");
        if (republish) qs.set("republish", "1");
        qs.set("limit", "200");
        return `/api/admin/gallery/migrate-media?${qs.toString()}`;
      };

      toast.loading("Проверяю tempfile ссылки...", { id: "migrate" });
      // Dry run with republish=1 to show how many drafts could be restored after fixing URLs.
      const dryRes = await fetch(mkUrl(true, true), { method: "POST", credentials: "include" });
      const dryJson = await dryRes.json().catch(() => null);
      if (!dryRes.ok) throw new Error(dryJson?.error || `Ошибка проверки (${dryRes.status})`);

      const scanned = Number(dryJson?.scanned || 0);
      const targets = Number(dryJson?.targets || 0);
      const wouldDisable = Array.isArray(dryJson?.details)
        ? dryJson.details.filter((d: any) => d?.action === "disabled").length
        : 0;
      const wouldRepublish = Array.isArray(dryJson?.details)
        ? dryJson.details.filter((d: any) => d?.action === "republished").length
        : 0;

      toast.success(`Проверка готова: scanned=${scanned}, targets=${targets}`, { id: "migrate" });
      if (!targets) return;

      const ok = confirm(
        `Найдено ${targets} карточек с tempfile URL.\n` +
        `Потенциально будет скрыто: ${wouldDisable}.\n` +
        `Потенциально будет восстановлено (опубликовано): ${wouldRepublish}.\n\n` +
        `Запустить миграцию сейчас?`
      );
      if (!ok) return;

      toast.loading("Мигрирую медиа в Storage...", { id: "migrate" });
      const res = await fetch(mkUrl(false, true), { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Ошибка миграции (${res.status})`);

      toast.success(
        `Миграция готова: updated=${json?.updated || 0}, republished=${json?.republished || 0}, disabled=${json?.disabled || 0}, skipped=${json?.skipped || 0}`,
        { id: "migrate" }
      );
      // Reload list so disabled items disappear from "published" views etc.
      await loadItems();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка миграции", { id: "migrate" });
    } finally {
      setMigrating(false);
    }
  }, [filterPlacement, loadItems, migrating]);

  useEffect(() => {
    if (userRole) loadItems();
  }, [userRole, loadItems]);

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterPlacement !== "all" && item.placement !== filterPlacement) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    home: items.filter(i => i.placement === "home").length,
    inspiration: items.filter(i => i.placement === "inspiration").length,
    featured: items.filter(i => i.featured).length,
    draft: items.filter(i => i.status === "draft").length,
  };

  // Delete item
  const handleDelete = async (presetId: string) => {
    if (!confirm("Удалить этот стиль из галереи?")) return;
    try {
      const res = await fetch(`/api/admin/gallery?presetId=${encodeURIComponent(presetId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.preset_id !== presetId));
        toast.success("Удалено!");
      } else {
        toast.error("Ошибка удаления");
      }
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  // Toggle status
  const handleToggleStatus = async (item: PublishedItem) => {
    const newStatus = item.status === "published" ? "draft" : "published";
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: item.id,
          presetId: item.preset_id,
          title: item.title,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
        toast.success(newStatus === "published" ? "Опубликовано!" : "Снято с публикации");
      }
    } catch {
      toast.error("Ошибка обновления");
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (item: PublishedItem) => {
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: item.id,
          presetId: item.preset_id,
          title: item.title,
          featured: !item.featured,
        }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, featured: !item.featured } : i));
        toast.success(item.featured ? "Убрано из Featured" : "Добавлено в Featured!");
      }
    } catch {
      toast.error("Ошибка обновления");
    }
  };

  // Open edit modal
  const openEdit = (item: PublishedItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditFeatured(item.featured);
    setEditPriority(item.priority);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editItem.id,
          presetId: editItem.preset_id,
          title: editTitle,
          category: editCategory,
          featured: editFeatured,
          priority: editPriority,
        }),
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === editItem.id ? {
          ...i,
          title: editTitle,
          category: editCategory,
          featured: editFeatured,
          priority: editPriority,
        } : i));
        toast.success("Сохранено!");
        setEditItem(null);
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  // Handle reorder (drag and drop)
  const handleReorder = async (newItems: PublishedItem[]) => {
    setItems(newItems);
    // Save new order to backend
    // This would need an API endpoint to update display_order in bulk
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Поддерживаются только изображения и видео");
      return;
    }
    
    setUploadingImage(true);
    setCreateContentType(isVideo ? "video" : "photo");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/admin/content/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      setCreateImageUrl(data.url);
      toast.success("Файл загружен!");
    } catch (error) {
      toast.error("Ошибка загрузки файла");
      console.error(error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Create new content
  const handleCreateContent = async () => {
    if (!createTitle.trim() || !createImageUrl.trim()) {
      toast.error("Заполните название и загрузите изображение");
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          presetId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: createTitle.trim(),
          contentType: createContentType,
          modelKey: createModelKey,
          previewImage: createImageUrl,
          previewUrl: createImageUrl,
          templatePrompt: createPrompt,
          placement: createPlacement,
          status: "published",
          category: createCategory || null,
          featured: false,
          priority: 0,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create");
      
      toast.success("Контент добавлен!");
      setShowCreateModal(false);
      resetCreateForm();
      loadItems();
    } catch (error) {
      toast.error("Ошибка создания контента");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateCategory("");
    setCreatePlacement("home");
    setCreateContentType("photo");
    setCreateImageUrl("");
    setCreatePrompt("");
    setCreateModelKey("nano-banana-pro");
  };

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-16">
      <div className="container mx-auto px-4 sm:px-6 py-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)] to-orange-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-black" />
              </div>
              Управление галереей
            </h1>
            <p className="text-[var(--muted)] mt-1">Стили на главной и вдохновении</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateModal(true)} className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
              <Plus className="w-4 h-4 mr-2" />
              Добавить контент
            </Button>
            <Button
              onClick={runTempfileMigration}
              disabled={loading || migrating}
              variant="outline"
              title="Переносит expiring tempfile.aiquickdraw.com в Supabase Storage и скрывает битые карточки"
            >
              <Upload className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
              Починить tempfile
            </Button>
            <Button onClick={loadItems} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Всего", value: stats.total, color: "text-[var(--text)]" },
            { label: "Главная", value: stats.home, color: "text-[var(--gold)]", icon: Home },
            { label: "Вдохновение", value: stats.inspiration, color: "text-blue-400", icon: Lightbulb },
            { label: "Featured", value: stats.featured, color: "text-amber-400", icon: Star },
            { label: "Черновики", value: stats.draft, color: "text-[var(--muted)]", icon: EyeOff },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center justify-between">
                {stat.icon && <stat.icon className={`w-4 h-4 ${stat.color}`} />}
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm"
            />
          </div>

          {/* Placement filter */}
          <select
            value={filterPlacement}
            onChange={(e) => setFilterPlacement(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm"
          >
            <option value="all">Все размещения</option>
            <option value="home">Главная</option>
            <option value="inspiration">Вдохновение</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-sm"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликовано</option>
            <option value="draft">Черновики</option>
          </select>
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden animate-pulse">
                <div className="aspect-square bg-[var(--surface2)]" />
                <div className="p-2 space-y-2">
                  <div className="h-3 bg-[var(--surface2)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--surface2)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
            <p className="text-[var(--muted)]">Нет стилей в галерее</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Публикуйте стили из раздела "Мои результаты"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden hover:border-[var(--gold)]/30 transition-all"
              >
                {/* Preview */}
                <div className="relative aspect-square bg-black/20">
                  {item.content_type === "video" ? (
                    <video
                      src={item.preview_url || item.preview_image}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      poster={item.poster_url}
                    />
                  ) : (
                    <img
                      src={item.preview_url || item.preview_image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {/* Placement */}
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.placement === "home" 
                        ? "bg-[var(--gold)]/90 text-black" 
                        : "bg-blue-500/90 text-white"
                    }`}>
                      {item.placement === "home" ? <Home className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                    </div>
                    {/* Featured */}
                    {item.featured && (
                      <div className="px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-medium">
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.content_type === "video" ? "bg-violet-500/90 text-white" : "bg-emerald-500/90 text-white"
                    }`}>
                      {item.content_type === "video" ? "🎬" : "🖼"}
                    </div>
                  </div>

                  {/* Status overlay */}
                  {item.status === "draft" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="px-2 py-1 rounded bg-white/20 text-white text-xs">Черновик</span>
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-lg bg-white text-black hover:bg-white/90"
                      title="Редактировать"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30"
                      title={item.status === "published" ? "Снять с публикации" : "Опубликовать"}
                    >
                      {item.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleFeatured(item)}
                      className={`p-2 rounded-lg ${item.featured ? 'bg-amber-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
                      title={item.featured ? "Убрать из Featured" : "Добавить в Featured"}
                    >
                      <Star className={`w-4 h-4 ${item.featured ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.preset_id)}
                      className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--text)] truncate">{item.title || "Без названия"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface2)] text-[var(--muted)]">
                        {item.category}
                      </span>
                    )}
                    {item.priority > 0 && (
                      <span className="text-[10px] text-[var(--gold)]">P{item.priority}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setEditItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-[var(--surface)] rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text)]">Редактировать стиль</h3>
                <button onClick={() => setEditItem(null)} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5 text-[var(--muted)]" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Preview */}
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  <img src={editItem.preview_url || editItem.preview_image} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Название</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Категория</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                    placeholder="Например: Портреты"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">
                    Приоритет <span className="text-[var(--muted)] font-normal">(выше = показывается первым)</span>
                  </label>
                  <input
                    type="number"
                    value={editPriority}
                    onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                    min="0"
                    max="100"
                  />
                </div>

                {/* Featured toggle */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={editFeatured}
                    onChange={(e) => setEditFeatured(e.target.checked)}
                    className="w-5 h-5 accent-amber-500"
                  />
                  <Star className={`w-4 h-4 ${editFeatured ? 'text-amber-400 fill-amber-400' : 'text-[var(--muted)]'}`} />
                  <span className="text-[var(--text)]">Featured</span>
                </label>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    {saving ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Content Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-lg bg-[var(--surface)] rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
                <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[var(--gold)]" />
                  Добавить контент
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-5 h-5 text-[var(--muted)]" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Upload/Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text)] block">Изображение / Видео *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {createImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      {createContentType === "video" ? (
                        <video src={createImageUrl} className="w-full h-full object-cover" muted autoPlay loop />
                      ) : (
                        <img src={createImageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => { setCreateImageUrl(""); fileInputRef.current?.click(); }}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--gold)]/50 flex flex-col items-center justify-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-all"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">Нажмите для загрузки</span>
                          <span className="text-xs text-[var(--muted)]">JPG, PNG, WebP, MP4</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <p className="text-xs text-[var(--muted)]">
                    Или вставьте URL изображения:
                  </p>
                  <input
                    type="text"
                    value={createImageUrl}
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Название *</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Название контента"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                  />
                </div>

                {/* Placement */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-2 block">Размещение</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreatePlacement("home")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                        createPlacement === "home" 
                          ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)]" 
                          : "bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      Главная
                    </button>
                    <button
                      onClick={() => setCreatePlacement("inspiration")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                        createPlacement === "inspiration" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                          : "bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      <Lightbulb className="w-4 h-4" />
                      Вдохновение
                    </button>
                  </div>
                </div>

                {/* Content Type */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-2 block">Тип контента</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreateContentType("photo")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                        createContentType === "photo" 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                          : "bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Фото
                    </button>
                    <button
                      onClick={() => setCreateContentType("video")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                        createContentType === "video" 
                          ? "bg-violet-500/20 border-violet-500 text-violet-400" 
                          : "bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      Видео
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Категория</label>
                  <input
                    type="text"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    placeholder="Например: Портреты, Пейзажи, Реклама"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                  />
                </div>

                {/* Model Key */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Модель</label>
                  <select
                    value={createModelKey}
                    onChange={(e) => setCreateModelKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm"
                  >
                    <option value="nano-banana-pro">Nano Banana Pro</option>
                    <option value="flux-2-pro">Flux 2 Pro</option>
                    <option value="flux-1-schnell">Flux Schnell</option>
                    <option value="gpt-image">GPT Image</option>
                    <option value="seedream-4.5">Seedream 4.5</option>
                    <option value="kling-2.1">Kling 2.1</option>
                    <option value="kling-motion-control">Kling Motion Control</option>
                    <option value="veo-3.1">Veo 3.1</option>
                    <option value="wan-2.1">Wan 2.1</option>
                  </select>
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-sm font-medium text-[var(--text)] mb-1 block">Промпт (опционально)</label>
                  <textarea
                    value={createPrompt}
                    onChange={(e) => setCreatePrompt(e.target.value)}
                    placeholder="Промпт для повторения этого стиля..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                    onClick={handleCreateContent}
                    disabled={isCreating || !createTitle.trim() || !createImageUrl.trim()}
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isCreating ? "Создание..." : "Добавить"}
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







