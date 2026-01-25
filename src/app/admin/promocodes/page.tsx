"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Copy, Check, XCircle, Clock } from "lucide-react";

interface Promocode {
  id: string;
  code: string;
  description: string | null;
  bonus_type: string;
  bonus_value: number;
  free_pack_id: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  times_used: number;
  total_bonus_given: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

const BONUS_TYPE_LABELS: Record<string, string> = {
  bonus_stars: "⭐ Бонусные звёзды",
  percent_discount: "💰 Скидка %",
  fixed_discount: "💵 Скидка",
  multiplier: "✨ Множитель",
  free_pack: "🎁 Бесплатный пакет",
};

const BONUS_TYPE_COLORS: Record<string, string> = {
  bonus_stars: "bg-yellow-500/20 text-yellow-400",
  percent_discount: "bg-green-500/20 text-green-400",
  fixed_discount: "bg-blue-500/20 text-blue-400",
  multiplier: "bg-purple-500/20 text-purple-400",
  free_pack: "bg-pink-500/20 text-pink-400",
};

export default function AdminPromocodesPage() {
  const [data, setData] = useState<{ promocodes: Promocode[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPromocodes = async () => {
    try {
      const res = await fetch("/api/admin/promocodes", { credentials: "include" });
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
    fetchPromocodes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить промокод?")) return;

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchPromocodes();
    } catch (err) {
      alert("Ошибка удаления");
    }
  };

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBonusValue = (promo: Promocode) => {
    switch (promo.bonus_type) {
      case "bonus_stars":
        return `+${promo.bonus_value} ⭐`;
      case "percent_discount":
        return `-${promo.bonus_value}%`;
      case "fixed_discount":
        return `-${promo.bonus_value}`;
      case "multiplier":
        return `x${promo.bonus_value}`;
      case "free_pack":
        return promo.free_pack_id || "Пакет";
      default:
        return promo.bonus_value;
    }
  };

  const getStatus = (promo: Promocode) => {
    if (!promo.is_active) return { label: "Неактивен", color: "text-gray-500" };
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return { label: "Истёк", color: "text-red-400" };
    }
    if (promo.max_uses && promo.times_used >= promo.max_uses) {
      return { label: "Исчерпан", color: "text-orange-400" };
    }
    if (new Date(promo.starts_at) > new Date()) {
      return { label: "Ожидает", color: "text-blue-400" };
    }
    return { label: "Активен", color: "text-emerald-400" };
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
          <h1 className="text-3xl font-bold text-[var(--text)]">Промокоды</h1>
          <p className="text-[var(--muted)]">
            Управление скидками и бонусами ({data?.total || 0} промокодов)
          </p>
        </div>
        <Link href="/admin/promocodes/new">
          <Button className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
            <Plus className="w-4 h-4 mr-2" />
            Новый промокод
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-[var(--muted)]">Всего</p>
            <p className="text-2xl font-bold">{data?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-[var(--muted)]">Активных</p>
            <p className="text-2xl font-bold text-emerald-400">
              {data?.promocodes.filter((p) => p.is_active).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-[var(--muted)]">Использований</p>
            <p className="text-2xl font-bold">
              {data?.promocodes.reduce((sum, p) => sum + p.times_used, 0) || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-[var(--muted)]">Выдано бонусов</p>
            <p className="text-2xl font-bold text-yellow-400">
              {data?.promocodes
                .filter((p) => p.bonus_type === "bonus_stars")
                .reduce((sum, p) => sum + p.total_bonus_given, 0) || 0}{" "}
              ⭐
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Promocodes List */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Все промокоды</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data?.promocodes?.length ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted)]">Промокодов пока нет</p>
              <Link href="/admin/promocodes/new" className="text-[var(--gold)] text-sm mt-2 block">
                Создать первый промокод
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {data.promocodes.map((promo) => {
                const status = getStatus(promo);
                return (
                  <div
                    key={promo.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--surface2)]/50 transition-colors"
                  >
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {/* Code with copy button */}
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 bg-[var(--surface2)] rounded-lg font-mono font-bold text-[var(--text)]">
                            {promo.code}
                          </code>
                          <button
                            onClick={() => copyCode(promo.code, promo.id)}
                            className="p-1 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                          >
                            {copiedId === promo.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Bonus type badge */}
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            BONUS_TYPE_COLORS[promo.bonus_type] || "bg-gray-500/20"
                          }`}
                        >
                          {formatBonusValue(promo)}
                        </span>

                        {/* Status */}
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--muted)]">
                        {promo.description || BONUS_TYPE_LABELS[promo.bonus_type]}
                        {" • "}
                        {promo.times_used}/{promo.max_uses || "∞"} использований
                        {promo.expires_at && (
                          <>
                            {" • "}
                            <Clock className="w-3 h-3 inline" /> до{" "}
                            {new Date(promo.expires_at).toLocaleDateString("ru-RU")}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/promocodes/${promo.id}`}
                        className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-[var(--muted)] hover:text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

