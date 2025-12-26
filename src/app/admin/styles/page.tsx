"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Sparkles, Home, Lightbulb, Trash2, Pencil, 
  Save, X, Loader2, RefreshCw, Plus,
  ChevronUp, ChevronDown, FolderPlus, Grid, List, ExternalLink
} from "lucide-react";

interface PublishedItem {
  id: string;
  presetId: string;
  title: string;
  previewUrl: string;
  modelKey: string;
  placement: string;
  category: string;
  status: string;
  createdAt: string;
  contentType?: string;
}

export default function AdminStylesPage() {
  const [publishedItems, setPublishedItems] = useState<PublishedItem[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [filterPlacement, setFilterPlacement] = useState<"all" | "home" | "inspiration">("all");
  
  // Edit modal
  const [editingItem, setEditingItem] = useState<PublishedItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState<"published" | "draft">("published");
  const [isSaving, setIsSaving] = useState(false);
  
  // New category
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    loadCategories();
    loadPublishedItems();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadPublishedItems = async () => {
    setLoadingPublished(true);
    try {
      const res = await fetch("/api/admin/gallery?limit=200", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.effects)) {
          setPublishedItems(data.effects.map((e: any) => ({
            id: e.id,
            presetId: e.preset_id,
            title: e.title,
            previewUrl: e.preview_url || e.preview_image,
            modelKey: e.model_key,
            placement: e.placement,
            category: e.category,
            status: e.status,
            createdAt: e.created_at,
            contentType: e.content_type,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to load published items:", error);
    } finally {
      setLoadingPublished(false);
    }
  };

  const handleDeleteItem = async (presetId: string) => {
    if (!confirm("Удалить этот контент?")) return;
    try {
      const res = await fetch(`/api/admin/gallery?presetId=${encodeURIComponent(presetId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Удалено!");
        loadPublishedItems();
      }
    } catch (error) {
      toast.error("Не удалось удалить");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingItem.id,
          presetId: editingItem.presetId,
          title: editTitle,
          category: editCategory,
          status: editStatus,
          published: editStatus === "published",
        }),
      });
      if (res.ok) {
        toast.success("Сохранено!");
        setEditingItem(null);
        loadPublishedItems();
      }
    } catch (error) {
      toast.error("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveItem = async (item: PublishedItem, direction: "up" | "down") => {
    const filtered = filteredItems;
    const currentIndex = filtered.findIndex(i => i.id === item.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;
    
    const targetItem = filtered[targetIndex];
    
    try {
      await Promise.all([
        fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: item.id, presetId: item.presetId, title: item.title, priority: targetIndex, order: targetIndex }),
        }),
        fetch("/api/admin/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: targetItem.id, presetId: targetItem.presetId, title: targetItem.title, priority: currentIndex, order: currentIndex }),
        }),
      ]);
      toast.success("Порядок изменён!");
      loadPublishedItems();
    } catch (error) {
      toast.error("Ошибка изменения порядка");
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await loadCategories();
        setNewCategoryInput("");
        setShowNewCategory(false);
        toast.success("Категория создана!");
      }
    } catch (error) {
      toast.error("Не удалось создать категорию");
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`Удалить категорию "${categoryName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories?name=${encodeURIComponent(categoryName)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Категория удалена!");
        loadCategories();
      }
    } catch (error) {
      toast.error("Ошибка удаления категории");
    }
  };

  const filteredItems = filterPlacement === "all" 
    ? publishedItems 
    : publishedItems.filter(i => i.placement === filterPlacement);

  const homeCount = publishedItems.filter(i => i.placement === "home").length;
  const inspirationCount = publishedItems.filter(i => i.placement === "inspiration").length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00D9FF]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00D9FF]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Управление контентом</h1>
                <p className="text-xs text-white/50">Главная и Вдохновение</p>
              </div>
            </div>
            
            <Link 
              href="/library"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D9FF] text-black font-medium hover:bg-[#1AE3FF] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Добавить контент
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-[#00D9FF]/10 border border-[#00D9FF]/30">
          <p className="text-sm text-white/80">
            💡 <strong>Как добавить контент:</strong> Перейдите в{" "}
            <Link href="/create" className="text-[#00D9FF] underline">Генератор</Link>
            {" "}→ создайте фото/видео →{" "}
            <Link href="/library" className="text-[#00D9FF] underline">Библиотека</Link>
            {" "}→ нажмите кнопку <span className="text-[#00D9FF]">📤 Опубликовать</span>
          </p>
        </div>

        {/* Stats & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPlacement("all")}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterPlacement === "all" ? "bg-[#00D9FF] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              Все ({publishedItems.length})
            </button>
            <button
              onClick={() => setFilterPlacement("home")}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                filterPlacement === "home" ? "bg-[#00D9FF] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Home className="w-4 h-4" />
              Главная ({homeCount})
            </button>
            <button
              onClick={() => setFilterPlacement("inspiration")}
              className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                filterPlacement === "inspiration" ? "bg-[#00D9FF] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Вдохновление ({inspirationCount})
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#00D9FF]/20 text-[#00D9FF]' : 'bg-white/5 text-white/60'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#00D9FF]/20 text-[#00D9FF]' : 'bg-white/5 text-white/60'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={loadPublishedItems} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 text-white/60 ${loadingPublished ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#00D9FF]" />
              Категории
            </h3>
            {!showNewCategory && (
              <button
                onClick={() => setShowNewCategory(true)}
                className="text-xs text-[#00D9FF] hover:underline"
              >
                + Создать
              </button>
            )}
          </div>
          
          {showNewCategory && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Название категории..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                autoFocus
              />
              <button onClick={handleCreateCategory} className="px-3 py-2 rounded-lg bg-[#00D9FF] text-black text-sm font-medium">
                Создать
              </button>
              <button onClick={() => { setShowNewCategory(false); setNewCategoryInput(""); }} className="px-3 py-2 rounded-lg bg-white/5 text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                <span className="text-sm text-white">{cat}</span>
                <button onClick={() => handleDeleteCategory(cat)} className="p-0.5 rounded hover:bg-red-500/30">
                  <X className="w-3 h-3 text-white/60 hover:text-red-400" />
                </button>
              </div>
            ))}
            {categories.length === 0 && <span className="text-xs text-white/40">Нет категорий</span>}
          </div>
        </div>

        {/* Published Items */}
        {loadingPublished ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#00D9FF]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-white/40 mb-4">Нет опубликованного контента</p>
            <Link 
              href="/library"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D9FF] text-black font-medium"
            >
              <Plus className="w-4 h-4" />
              Добавить из библиотеки
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="relative group rounded-xl overflow-hidden bg-black">
                <div className="aspect-square">
                  {item.contentType === "video" ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => { setEditingItem(item); setEditTitle(item.title); setEditCategory(item.category || ""); setEditStatus(item.status as any); }} 
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30"
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => handleDeleteItem(item.presetId)} className="p-2 rounded-lg bg-red-500/50 hover:bg-red-500/70">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.placement === "home" ? (
                    <div className="p-1 rounded bg-[#00D9FF]/80"><Home className="w-3 h-3 text-black" /></div>
                  ) : (
                    <div className="p-1 rounded bg-blue-500/80"><Lightbulb className="w-3 h-3 text-white" /></div>
                  )}
                  {item.contentType === "video" && (
                    <div className="px-1.5 py-0.5 rounded bg-purple-500/80 text-[10px] text-white font-medium">🎬</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0">
                  {item.contentType === "video" ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{item.title?.slice(0, 50) || "—"}</span>
                    {item.contentType === "video" && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">🎬</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {item.placement === "home" ? <Home className="w-3 h-3 text-[#00D9FF]" /> : <Lightbulb className="w-3 h-3 text-blue-400" />}
                    <span className="text-xs text-white/40">{item.placement === "home" ? "Главная" : "Вдохновение"}</span>
                    {item.category && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60">{item.category}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {item.status === "published" ? "✓" : "Черновик"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleMoveItem(item, "up")} disabled={index === 0} className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30">
                    <ChevronUp className="w-4 h-4 text-white/60" />
                  </button>
                  <button onClick={() => handleMoveItem(item, "down")} disabled={index === filteredItems.length - 1} className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30">
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setEditTitle(item.title); setEditCategory(item.category || ""); setEditStatus(item.status as any); }} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                    <Pencil className="w-4 h-4 text-white/60" />
                  </button>
                  <button onClick={() => handleDeleteItem(item.presetId)} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Редактирование</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Название</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Категория</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                  <option value="">Без категории</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Статус</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                  <option value="published">Опубликован</option>
                  <option value="draft">Черновик</option>
                </select>
              </div>
              <button onClick={handleSaveEdit} disabled={isSaving} className="w-full py-3 rounded-xl bg-[#00D9FF] text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Сохранить</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
