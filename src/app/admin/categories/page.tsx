"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Edit2, Trash2, Check, X, Plus, Hash, Eye } from "lucide-react";
import { toast } from "sonner";

interface Category {
  name: string;
  count: number;
  placements: string[];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      toast.error("Ошибка загрузки категорий");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleRename = async (oldName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingName(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldName, newName: newName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to rename");

      toast.success("Категория переименована");
      setEditingName(null);
      fetchCategories();
    } catch (error) {
      toast.error("Ошибка переименования");
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Удалить категорию "${name}"? Контент останется, но без категории.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Категория удалена");
      fetchCategories();
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  const getPlacementBadge = (placements: string[]) => {
    if (placements.includes("both") || (placements.includes("home") && placements.includes("inspiration"))) {
      return (
        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
          Оба
        </span>
      );
    }
    if (placements.includes("home") || placements.includes("homepage")) {
      return (
        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
          Главная
        </span>
      );
    }
    if (placements.includes("inspiration")) {
      return (
        <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
          Вдохновение
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-[var(--surface)] animate-pulse rounded-lg" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface)] animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Категории</h1>
          <p className="text-[var(--muted)]">
            Управление категориями контента ({categories.length} категорий)
          </p>
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FolderOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text)]">
                Категории автоматически создаются при добавлении контента в разделе "Стили" или "Галерея".
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Здесь можно переименовать или удалить категории. При удалении контент остаётся, но без категории.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Все категории</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Категорий пока нет</p>
              <p className="text-sm mt-1">
                Создайте контент в разделе "Стили" с указанием категории
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors"
                >
                  {editingName === cat.name ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(cat.name);
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        className="flex-1 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--gold)]"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRename(cat.name)}
                        className="text-emerald-400"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingName(null)}
                        className="text-[var(--muted)]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface2)] flex items-center justify-center">
                          <Hash className="w-5 h-5 text-[var(--muted)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--text)]">{cat.name}</span>
                            {getPlacementBadge(cat.placements)}
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            {cat.count} {cat.count === 1 ? "элемент" : "элементов"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingName(cat.name);
                            setNewName(cat.name);
                          }}
                          className="text-[var(--muted)] hover:text-[var(--text)]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(cat.name)}
                          className="text-[var(--muted)] hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Советы по категориям</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-[var(--surface2)]">
              <h4 className="font-medium text-[var(--text)] mb-2">🎨 Для главной</h4>
              <p className="text-[var(--muted)]">
                Используйте категории вроде "Портреты", "Пейзажи", "Продукты" для организации галереи на главной странице.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--surface2)]">
              <h4 className="font-medium text-[var(--text)] mb-2">✨ Для вдохновения</h4>
              <p className="text-[var(--muted)]">
                В разделе Inspiration используйте более специфичные категории: "Аниме", "Киберпанк", "Винтаж" и т.д.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

