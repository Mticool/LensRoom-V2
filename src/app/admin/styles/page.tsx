"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/button";

interface Style {
  id: string;
  title: string;
  description?: string;
  placement: "homepage" | "inspiration" | "both";
  preview_image?: string;
  thumbnail_url?: string;
  model_key: string;
  preset_id?: string;
  template_prompt?: string;
  cost_stars: number;
  featured: boolean;
  published: boolean;
  display_order: number;
  category?: string;
  tags?: string[];
  views_count: number;
  uses_count: number;
  created_at: string;
  updated_at: string;
}

export default function AdminStylesPage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadStyles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/styles", { credentials: "include" });
      const data = await res.json();
      setStyles(data.styles || []);
    } catch (error) {
      console.error("Failed to load styles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStyles();
  }, []);

  const handleSave = async (style: Partial<Style>) => {
    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(style),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save style");
      }

      await loadStyles();
      setShowForm(false);
      setEditingStyle(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот стиль?")) return;

    try {
      const res = await fetch(`/api/admin/styles?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete style");
      }

      await loadStyles();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const columns: Column<Style>[] = [
    {
      key: "preview_image",
      label: "Превью",
      mobileLabel: "📷",
      render: (item) =>
        item.preview_image ? (
          <img
            src={item.preview_image}
            alt={item.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        ) : (
          <div className="w-16 h-16 bg-[var(--surface2)] rounded-lg flex items-center justify-center text-xs text-[var(--muted)]">
            Нет
          </div>
        ),
    },
    {
      key: "title",
      label: "Название",
      mobileLabel: "Название",
      render: (item) => (
        <div>
          <div className="font-medium text-[var(--text)]">{item.title}</div>
          {item.description && (
            <div className="text-xs text-[var(--muted)] mt-1">
              {item.description.slice(0, 50)}
              {item.description.length > 50 ? "..." : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "placement",
      label: "Размещение",
      mobileLabel: "📍",
      render: (item) => {
        const labels = {
          homepage: "Главная",
          inspiration: "Вдохновение",
          both: "Оба",
        };
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface2)] text-[var(--muted)]">
            {labels[item.placement]}
          </span>
        );
      },
    },
    {
      key: "cost_stars",
      label: "Стоимость",
      mobileLabel: "⭐",
      render: (item) => `${item.cost_stars} ⭐`,
    },
    {
      key: "status",
      label: "Статус",
      mobileLabel: "📊",
      render: (item) => (
        <div className="flex gap-2">
          {item.published ? (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
              ✓ Опубликован
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
              ✗ Черновик
            </span>
          )}
          {item.featured && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
              ⭐ Избранное
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stats",
      label: "Статистика",
      mobileLabel: "📈",
      render: (item) => (
        <div className="text-xs text-[var(--muted)]">
          {item.views_count} просм. / {item.uses_count} исп.
        </div>
      ),
    },
    {
      key: "actions",
      label: "Действия",
      mobileLabel: "⚙️",
      render: (item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingStyle(item);
              setShowForm(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(item.id)}
            className="text-red-400 hover:text-red-300"
          >
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Стили</h1>
          <p className="text-[var(--muted)]">
            Управление стилями для главной страницы и раздела вдохновение
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingStyle(null);
            setShowForm(true);
          }}
        >
          + Добавить стиль
        </Button>
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <StyleForm
          style={editingStyle}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingStyle(null);
          }}
        />
      )}

      {/* Таблица стилей */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Все стили ({styles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)]">Загрузка...</div>
          ) : (
            <AdminTable
              columns={columns}
              data={styles}
              getRowKey={(item) => item.id}
              emptyMessage="Нет стилей"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StyleForm({
  style,
  onSave,
  onCancel,
}: {
  style: Style | null;
  onSave: (style: Partial<Style>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Style>>(
    style || {
      title: "",
      description: "",
      placement: "inspiration",
      model_key: "flux-1.1-pro",
      cost_stars: 4,
      featured: false,
      published: true,
      display_order: 0,
      tags: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{style ? "Редактировать стиль" : "Новый стиль"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Название *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Размещение */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Размещение *
              </label>
              <select
                value={formData.placement}
                onChange={(e) =>
                  setFormData({ ...formData, placement: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="homepage">Главная</option>
                <option value="inspiration">Вдохновение</option>
                <option value="both">Оба</option>
              </select>
            </div>

            {/* Описание */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Превью URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                URL превью
              </label>
              <input
                type="url"
                value={formData.preview_image}
                onChange={(e) =>
                  setFormData({ ...formData, preview_image: e.target.value })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Model Key */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Model Key *
              </label>
              <input
                type="text"
                required
                value={formData.model_key}
                onChange={(e) => setFormData({ ...formData, model_key: e.target.value })}
                placeholder="flux-1.1-pro"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Стоимость */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Стоимость (⭐)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cost_stars}
                onChange={(e) =>
                  setFormData({ ...formData, cost_stars: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Порядок */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Порядок отображения
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Категория
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="portrait, landscape, art..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Template Prompt */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Шаблон промпта
              </label>
              <textarea
                value={formData.template_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, template_prompt: e.target.value })
                }
                rows={2}
                placeholder="A beautiful {subject} in {style}..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Чекбоксы */}
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) =>
                    setFormData({ ...formData, published: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">Опубликовано</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">Избранное</span>
              </label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
