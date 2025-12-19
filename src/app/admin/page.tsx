"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";

interface OverviewData {
  users_total: number;
  users_new_7d: number;
  revenue_7d: {
    gross: number;
    net_after_tax_10pct: number;
  };
  packs_top: Array<{
    packId: string;
    count: number;
    rub: number;
    stars: number;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview", { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        console.error("Failed to load overview:", err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<OverviewData["packs_top"][0]>[] = [
    { key: "packId", label: "Пакет", mobileLabel: "Пакет" },
    {
      key: "count",
      label: "Продаж",
      mobileLabel: "Продаж",
      render: (item) => item.count,
    },
    {
      key: "stars",
      label: "Звёзд",
      mobileLabel: "⭐",
      render: (item) => `${item.stars.toLocaleString("ru")} ⭐`,
    },
    {
      key: "rub",
      label: "Выручка",
      mobileLabel: "₽",
      render: (item) => `${item.rub.toLocaleString("ru")} ₽`,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-[var(--surface)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Админ-панель</h1>
          <p className="text-[var(--muted)]">Добро пожаловать в панель управления LensRoom</p>
        </div>
        
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
          <h3 className="text-orange-400 font-medium mb-2">⚠️ Данные временно недоступны</h3>
          <p className="text-sm text-[var(--muted)]">
            Не удалось загрузить статистику: {error}
          </p>
          <p className="text-sm text-[var(--muted)] mt-2">
            Используйте меню выше для навигации по другим разделам.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="font-medium mb-2">🎨 Стили</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Управление стилями для главной и вдохновения
            </p>
            <a 
              href="/admin/styles"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Перейти →
            </a>
          </div>

          <div className="p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="font-medium mb-2">⚡ Менеджеры</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Управление ролями пользователей
            </p>
            <a 
              href="/admin/managers"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Перейти →
            </a>
          </div>

          <div className="p-6 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="font-medium mb-2">👤 Пользователи</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Список всех пользователей
            </p>
            <a 
              href="/admin/users"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Перейти →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted)]">Не удалось загрузить данные</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Обзор</h1>
        <p className="text-[var(--muted)]">Основные метрики за последние 7 дней</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Всего пользователей"
          value={data.users_total.toLocaleString("ru")}
          trend={`+${data.users_new_7d} за 7 дней`}
        />
        <StatCard
          title="Новых за 7 дней"
          value={data.users_new_7d.toLocaleString("ru")}
        />
        <StatCard
          title="Выручка (gross)"
          value={`${data.revenue_7d.gross.toLocaleString("ru")} ₽`}
          subtitle="За 7 дней"
        />
        <StatCard
          title="Выручка (net)"
          value={`${data.revenue_7d.net_after_tax_10pct.toLocaleString("ru")} ₽`}
          subtitle="После 10% комиссии"
        />
      </div>

      {/* Top packs */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Топ пакетов</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={data.packs_top}
            getRowKey={(item) => item.packId}
            emptyMessage="Нет продаж"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text)]">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
          {trend && (
            <p className="text-xs text-emerald-400 font-medium">{trend}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

