"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  CreditCard,
  TrendingUp,
  Sparkles,
  FileImage,
  FileText,
  Tag,
  Plus,
  ArrowRight,
  Star,
  Eye,
  Zap,
  Activity,
} from "lucide-react";

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

interface GenerationStats {
  total: number;
  today: number;
  byModel: Array<{ model: string; count: number }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [genStats, setGenStats] = useState<GenerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/admin/analytics/generations", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([overview, generations]) => {
        setData(overview);
        setGenStats(generations);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="h-64 rounded-xl bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Дашборд</h1>
          <p className="text-[var(--muted)] mt-1">Обзор основных метрик</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/generator">
            <Button className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
              <Sparkles className="w-4 h-4 mr-2" />
              Генератор
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Пользователей"
          value={data?.users_total?.toLocaleString("ru") || "—"}
          change={data?.users_new_7d ? `+${data.users_new_7d} за 7д` : undefined}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Выручка (7д)"
          value={data?.revenue_7d?.gross ? `${data.revenue_7d.gross.toLocaleString("ru")} ₽` : "—"}
          subtitle="gross"
          icon={CreditCard}
          color="green"
        />
        <StatCard
          title="Генераций всего"
          value={genStats?.total?.toLocaleString("ru") || "—"}
          change={genStats?.today ? `+${genStats.today} сегодня` : undefined}
          icon={Sparkles}
          color="purple"
        />
        <StatCard
          title="Выручка (net)"
          value={data?.revenue_7d?.net_after_tax_10pct ? `${data.revenue_7d.net_after_tax_10pct.toLocaleString("ru")} ₽` : "—"}
          subtitle="после комиссии"
          icon={TrendingUp}
          color="gold"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--gold)]" />
            Быстрые действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              href="/admin/styles"
              icon={FileImage}
              label="Новый стиль"
              action="add"
            />
            <QuickAction
              href="/admin/articles/new"
              icon={FileText}
              label="Новая статья"
              action="add"
            />
            <QuickAction
              href="/admin/promocodes/new"
              icon={Tag}
              label="Промокод"
              action="add"
            />
            <QuickAction
              href="/admin/generator"
              icon={Sparkles}
              label="AI Генерация"
              action="go"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Packs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Топ пакетов</CardTitle>
            <Link href="/admin/sales" className="text-sm text-[var(--gold)] hover:underline">
              Все продажи →
            </Link>
          </CardHeader>
          <CardContent>
            {!data?.packs_top?.length ? (
              <p className="text-sm text-[var(--muted)] py-4">Нет данных о продажах</p>
            ) : (
              <div className="space-y-3">
                {data.packs_top.slice(0, 5).map((pack, i) => (
                  <div
                    key={pack.packId}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--surface2)] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium">{pack.packId}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[var(--muted)]">{pack.count} продаж</span>
                      <span className="font-semibold">{pack.rub.toLocaleString("ru")} ₽</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Models */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Популярные модели</CardTitle>
            <Link href="/admin/content" className="text-sm text-[var(--gold)] hover:underline">
              Контент →
            </Link>
          </CardHeader>
          <CardContent>
            {!genStats?.byModel?.length ? (
              <p className="text-sm text-[var(--muted)] py-4">Нет данных о генерациях</p>
            ) : (
              <div className="space-y-3">
                {genStats.byModel.slice(0, 5).map((item, i) => {
                  const maxCount = genStats.byModel[0]?.count || 1;
                  const percent = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.model} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{item.model || "Unknown"}</span>
                        <span className="text-[var(--muted)]">{item.count.toLocaleString("ru")}</span>
                      </div>
                      <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--gold)] rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted)]">
            <p>Здесь будет лента последних действий</p>
            <p className="text-sm mt-1">(регистрации, покупки, генерации)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change?: string;
  subtitle?: string;
  icon: any;
  color: "blue" | "green" | "purple" | "gold";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-emerald-500/10 text-emerald-400",
    purple: "bg-purple-500/10 text-purple-400",
    gold: "bg-[var(--gold)]/10 text-[var(--gold)]",
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--muted)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text)] mt-1">{value}</p>
            {change && <p className="text-xs text-emerald-400 mt-1">{change}</p>}
            {subtitle && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  action,
}: {
  href: string;
  icon: any;
  label: string;
  action: "add" | "go";
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] hover:border-[var(--gold)]/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--surface2)] group-hover:bg-[var(--gold)]/10 flex items-center justify-center transition-colors">
        {action === "add" ? (
          <Plus className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--gold)]" />
        ) : (
          <Icon className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--gold)]" />
        )}
      </div>
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
    </Link>
  );
}
