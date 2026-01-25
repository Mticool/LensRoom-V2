"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Sparkles } from "lucide-react";

const BONUS_TYPES = [
  { value: "bonus_stars", label: "⭐ Бонусные звёзды", description: "Мгновенное начисление звёзд" },
  { value: "percent_discount", label: "💰 Скидка %", description: "Процент скидки на пакет" },
  { value: "fixed_discount", label: "💵 Скидка", description: "Фиксированная скидка" },
  { value: "multiplier", label: "✨ Множитель", description: "Умножение звёзд при покупке" },
  { value: "free_pack", label: "🎁 Бесплатный пакет", description: "Выдача пакета бесплатно" },
];

export default function NewPromocodePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    bonus_type: "bonus_stars",
    bonus_value: "50",
    free_pack_id: "",
    max_uses: "",
    max_uses_per_user: "1",
    min_purchase_amount: "",
    starts_at: "",
    expires_at: "",
    is_active: true,
  });

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, code }));
  };

  const handleSubmit = async () => {
    if (!form.code || !form.bonus_type || !form.bonus_value) {
      setError("Заполните код, тип бонуса и значение");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/promocodes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bonus_value: parseFloat(form.bonus_value),
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          max_uses_per_user: form.max_uses_per_user ? parseInt(form.max_uses_per_user) : 1,
          min_purchase_amount: form.min_purchase_amount ? parseInt(form.min_purchase_amount) : null,
          starts_at: form.starts_at || null,
          expires_at: form.expires_at || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания");
      }

      router.push("/admin/promocodes");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBonusValueLabel = () => {
    switch (form.bonus_type) {
      case "bonus_stars":
        return "Количество звёзд";
      case "percent_discount":
        return "Процент скидки (1-100)";
      case "fixed_discount":
        return "Сумма скидки";
      case "multiplier":
        return "Множитель (например 1.5 = +50%)";
      case "free_pack":
        return "ID пакета";
      default:
        return "Значение";
    }
  };

  const getBonusValuePlaceholder = () => {
    switch (form.bonus_type) {
      case "bonus_stars":
        return "50";
      case "percent_discount":
        return "20";
      case "fixed_discount":
        return "100";
      case "multiplier":
        return "1.5";
      case "free_pack":
        return "pack_100";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/promocodes"
          className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Новый промокод</h1>
          <p className="text-sm text-[var(--muted)]">Создайте скидку или бонус</p>
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
              placeholder="WELCOME50"
              className="flex-1 px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 font-mono uppercase"
            />
            <Button variant="outline" onClick={generateCode} className="shrink-0">
              <Sparkles className="w-4 h-4 mr-2" />
              Сгенерировать
            </Button>
          </div>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Описание (например: Приветственный бонус)"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BONUS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setForm({ ...form, bonus_type: type.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.bonus_type === type.value
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-[var(--border)] hover:border-white/20"
                }`}
              >
                <div className="font-medium text-[var(--text)]">{type.label}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{type.description}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              {getBonusValueLabel()} *
            </label>
            <input
              type={form.bonus_type === "free_pack" ? "text" : "number"}
              value={form.bonus_value}
              onChange={(e) => setForm({ ...form, bonus_value: e.target.value })}
              placeholder={getBonusValuePlaceholder()}
              step={form.bonus_type === "multiplier" ? "0.1" : "1"}
              min={form.bonus_type === "multiplier" ? "1.1" : "1"}
              max={form.bonus_type === "percent_discount" ? "100" : undefined}
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
            />
          </div>

          {form.bonus_type === "free_pack" && (
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                ID пакета *
              </label>
              <input
                type="text"
                value={form.free_pack_id}
                onChange={(e) => setForm({ ...form, free_pack_id: e.target.value })}
                placeholder="pack_100"
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          )}
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
                Макс. использований (всего)
              </label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="∞"
                min="1"
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                На одного пользователя
              </label>
              <input
                type="number"
                value={form.max_uses_per_user}
                onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                placeholder="1"
                min="1"
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          </div>

          {(form.bonus_type === "percent_discount" || form.bonus_type === "fixed_discount") && (
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                Мин. сумма покупки
              </label>
              <input
                type="number"
                value={form.min_purchase_amount}
                onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
                placeholder="Без ограничений"
                min="0"
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period */}
      <Card>
        <CardHeader>
          <CardTitle>Период действия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-2 block">
                Начало
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
          <p className="text-xs text-[var(--muted)]">
            Оставьте пустым для бессрочного действия
          </p>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-[var(--border)] bg-[var(--surface2)] text-[var(--gold)] focus:ring-[var(--gold)]"
            />
            <div>
              <div className="font-medium text-[var(--text)]">Активен</div>
              <div className="text-xs text-[var(--muted)]">
                Промокод можно использовать сразу после создания
              </div>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
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
          Создать промокод
        </Button>
      </div>
    </div>
  );
}

