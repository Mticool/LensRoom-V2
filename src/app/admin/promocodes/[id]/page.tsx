"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Trash2, Copy, Check } from "lucide-react";

interface Promocode {
  id: string;
  code: string;
  description: string | null;
  bonus_type: string;
  bonus_value: number;
  free_pack_id: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  min_purchase_amount: number | null;
  times_used: number;
  total_bonus_given: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface Usage {
  id: string;
  user_id: string;
  bonus_type: string;
  bonus_value: number;
  pack_id: string | null;
  used_at: string;
}

const BONUS_TYPES = [
  { value: "bonus_stars", label: "⭐ Бонусные звёзды" },
  { value: "percent_discount", label: "💰 Скидка %" },
  { value: "fixed_discount", label: "💵 Скидка" },
  { value: "multiplier", label: "✨ Множитель" },
  { value: "free_pack", label: "🎁 Бесплатный пакет" },
];

export default function EditPromocodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promocode, setPromocode] = useState<Promocode | null>(null);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    bonus_type: "bonus_stars",
    bonus_value: "",
    free_pack_id: "",
    max_uses: "",
    max_uses_per_user: "1",
    min_purchase_amount: "",
    starts_at: "",
    expires_at: "",
    is_active: true,
  });

  useEffect(() => {
    const fetchPromocode = async () => {
      try {
        const res = await fetch(`/api/admin/promocodes/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Промокод не найден");
        const data = await res.json();
        setPromocode(data.promocode);
        setUsages(data.usages || []);

        const p = data.promocode;
        setForm({
          code: p.code,
          description: p.description || "",
          bonus_type: p.bonus_type,
          bonus_value: p.bonus_value.toString(),
          free_pack_id: p.free_pack_id || "",
          max_uses: p.max_uses?.toString() || "",
          max_uses_per_user: p.max_uses_per_user?.toString() || "1",
          min_purchase_amount: p.min_purchase_amount?.toString() || "",
          starts_at: p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 16) : "",
          expires_at: p.expires_at ? new Date(p.expires_at).toISOString().slice(0, 16) : "",
          is_active: p.is_active,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPromocode();
  }, [id]);

  const handleSubmit = async () => {
    if (!form.code || !form.bonus_type || !form.bonus_value) {
      setError("Заполните код, тип бонуса и значение");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bonus_value: parseFloat(form.bonus_value),
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          max_uses_per_user: form.max_uses_per_user ? parseInt(form.max_uses_per_user) : 1,
          min_purchase_amount: form.min_purchase_amount
            ? parseInt(form.min_purchase_amount)
            : null,
          starts_at: form.starts_at || null,
          expires_at: form.expires_at || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка сохранения");
      }

      router.push("/admin/promocodes");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить промокод безвозвратно?")) return;

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      router.push("/admin/promocodes");
    } catch (err) {
      alert("Ошибка удаления");
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(form.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-[var(--surface)] animate-pulse rounded-lg" />
        <div className="h-64 bg-[var(--surface)] animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error && !promocode) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <Link href="/admin/promocodes" className="text-[var(--gold)] text-sm mt-4 block">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/promocodes"
            className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              Редактирование промокода
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {promocode?.times_used || 0} использований •{" "}
              {promocode?.total_bonus_given || 0} выдано бонусов
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Code */}
      <Card>
        <CardHeader>
          <CardTitle>Код промокода</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="flex-1 px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] font-mono uppercase focus:outline-none focus:border-[var(--gold)]/50"
            />
            <Button variant="outline" onClick={copyCode} className="shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Описание"
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
          />
        </CardContent>
      </Card>

      {/* Bonus Type */}
      <Card>
        <CardHeader>
          <CardTitle>Тип бонуса</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {BONUS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setForm({ ...form, bonus_type: type.value })}
                className={`p-3 rounded-xl border text-left transition-all text-sm ${
                  form.bonus_type === type.value
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-[var(--border)] hover:border-white/20"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Значение бонуса *
            </label>
            <input
              type={form.bonus_type === "free_pack" ? "text" : "number"}
              value={form.bonus_value}
              onChange={(e) => setForm({ ...form, bonus_value: e.target.value })}
              step={form.bonus_type === "multiplier" ? "0.1" : "1"}
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--gold)]/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Ограничения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                Макс. использований
              </label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="∞"
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                На пользователя
              </label>
              <input
                type="number"
                value={form.max_uses_per_user}
                onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                Начало действия
              </label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                Окончание
              </label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-[var(--text)]">Активен</span>
          </label>
        </CardContent>
      </Card>

      {/* Usage History */}
      {usages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>История использования</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usages.map((usage) => (
                <div
                  key={usage.id}
                  className="flex items-center justify-between py-2 px-3 bg-[var(--surface2)] rounded-lg text-sm"
                >
                  <span className="text-[var(--muted)] font-mono text-xs">
                    {usage.user_id.slice(0, 8)}...
                  </span>
                  <span className="text-[var(--text)]">+{usage.bonus_value}</span>
                  <span className="text-[var(--muted)]">
                    {new Date(usage.used_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleDelete}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Удалить
        </Button>

        <div className="flex items-center gap-3">
          <Link href="/admin/promocodes">
            <Button variant="outline" className="border-[var(--border)]">
              Отмена
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

