"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminArticlesPage() {
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/admin/articles", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить статью?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchArticles();
    } catch (err) {
      alert("Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (article: Article) => {
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...article,
          is_published: !article.is_published,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchArticles();
    } catch (err) {
      alert("Ошибка обновления");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-[var(--surface)] animate-pulse rounded-lg" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--surface)] animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Ошибка: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Статьи</h1>
          <p className="text-[var(--muted)]">
            Управление блогом для SEO ({data?.total || 0} статей)
          </p>
        </div>
        <Link href="/admin/articles/new">
          <Button className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
            <Plus className="w-4 h-4 mr-2" />
            Новая статья
          </Button>
        </Link>
      </div>

      {/* Articles List */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Все статьи</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.articles?.length ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted)]">Статей пока нет</p>
              <Link href="/admin/articles/new" className="text-[var(--gold)] text-sm mt-2 block">
                Создать первую статью
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.articles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--surface2)]/50 transition-colors"
                >
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text)] truncate">
                        {article.title}
                      </h3>
                      {article.is_published ? (
                        <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                          Опубликовано
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                          Черновик
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)] truncate">
                      /{article.slug} • {article.views_count} просмотров •{" "}
                      {formatDate(article.created_at)}
                    </p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {article.is_published && (
                      <a
                        href={`/blog/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                        title="Открыть на сайте"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleTogglePublish(article)}
                      className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                      title={article.is_published ? "Снять с публикации" : "Опубликовать"}
                    >
                      {article.is_published ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="p-2 text-[var(--muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
