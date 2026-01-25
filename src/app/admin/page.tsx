"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  CreditCard,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Activity,
  Image as ImageIcon,
  Video,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  RefreshCw,
  DollarSign,
  Star,
  UserPlus,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelData {
  funnel: {
    registration: number;
    firstGeneration: number;
    firstPurchase: number;
    repeatPurchase: number;
  };
  timeSeries: Array<{
    date: string;
    users: number;
    generations: number;
    revenue: number;
    stars_spent: number;
  }>;
  today: {
    users: number;
    generations: number;
    revenue: number;
  };
  breakdown: {
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

interface LaoZhangStats {
  period: number;
  totals: {
    generations: number;
    success: number;
    failed: number;
    costUsd: number;
    costRub: number;
  };
  byModel: Array<{
    model: string;
    count: number;
    success: number;
    failed: number;
    costUsd: number;
    costRub: number;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [laozhangStats, setLaozhangStats] = useState<LaoZhangStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(30);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [funnelRes, laozhangRes] = await Promise.all([
        fetch(`/api/admin/analytics/funnel?days=${period}`, { credentials: "include" }),
        fetch(`/api/admin/laozhang-stats?days=${period}`, { credentials: "include" }),
      ]);
      
      if (funnelRes.ok) {
        const json = await funnelRes.json();
        setData(json);
      }
      
      if (laozhangRes.ok) {
        const json = await laozhangRes.json();
        setLaozhangStats(json);
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  // Calculate period changes
  const periodChanges = useMemo(() => {
    if (!data?.timeSeries?.length) return null;

    const halfPoint = Math.floor(data.timeSeries.length / 2);
    const firstHalf = data.timeSeries.slice(0, halfPoint);
    const secondHalf = data.timeSeries.slice(halfPoint);

    const sum = (arr: typeof data.timeSeries, key: keyof typeof arr[0]) =>
      arr.reduce((acc, d) => acc + (typeof d[key] === "number" ? d[key] : 0), 0);

    const usersFirst = sum(firstHalf, "users");
    const usersSecond = sum(secondHalf, "users");
    const gensFirst = sum(firstHalf, "generations");
    const gensSecond = sum(secondHalf, "generations");
    const revFirst = sum(firstHalf, "revenue");
    const revSecond = sum(secondHalf, "revenue");

    return {
      users: usersFirst > 0 ? Math.round(((usersSecond - usersFirst) / usersFirst) * 100) : 0,
      generations: gensFirst > 0 ? Math.round(((gensSecond - gensFirst) / gensFirst) * 100) : 0,
      revenue: revFirst > 0 ? Math.round(((revSecond - revFirst) / revFirst) * 100) : 0,
    };
  }, [data]);

  // Calculate totals for period
  const periodTotals = useMemo(() => {
    if (!data?.timeSeries?.length) return { users: 0, generations: 0, revenue: 0 };
    return {
      users: data.timeSeries.reduce((a, d) => a + d.users, 0),
      generations: data.timeSeries.reduce((a, d) => a + d.generations, 0),
      revenue: data.timeSeries.reduce((a, d) => a + d.revenue, 0),
    };
  }, [data]);

  // Max value for chart scaling
  const maxChartValue = useMemo(() => {
    if (!data?.timeSeries?.length) return 100;
    return Math.max(...data.timeSeries.map((d) => Math.max(d.users, d.generations / 10, d.revenue / 100)));
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="h-64 rounded-xl bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Аналитика</h1>
          <p className="text-[var(--muted)] mt-1">Ключевые метрики и воронка</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-lg bg-[var(--surface)] border border-[var(--border)] p-1">
            {([7, 14, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  period === p
                    ? "bg-[var(--gold)] text-black"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {p}д
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Обновить</span>
            </Button>
        </div>
      </div>

      {/* Today's Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          title="Сегодня пользователей"
          value={data?.today.users || 0}
          icon={UserPlus}
          color="blue"
        />
        <QuickStat
          title="Сегодня генераций"
          value={data?.today.generations || 0}
          icon={Sparkles}
          color="purple"
        />
        <QuickStat
          title="Сегодня выручка"
          value={(data?.today.revenue || 0).toLocaleString("ru")}
          icon={DollarSign}
          color="green"
        />
        <QuickStat
          title="Всего пользователей"
          value={(data?.funnel.registration || 0).toLocaleString("ru")}
          icon={Users}
          color="gold"
        />
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={`Регистрации за ${period}д`}
          value={periodTotals.users.toLocaleString("ru")}
          change={periodChanges?.users}
          icon={Users}
          color="blue"
        />
        <StatCard
          title={`Генерации за ${period}д`}
          value={periodTotals.generations.toLocaleString("ru")}
          change={periodChanges?.generations}
          icon={Sparkles}
          color="purple"
        />
        <StatCard
          title={`Выручка за ${period}д`}
          value={periodTotals.revenue.toLocaleString("ru")}
          change={periodChanges?.revenue}
          icon={CreditCard}
          color="green"
        />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--gold)]" />
            Воронка конверсий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FunnelStep
              label="Регистрация"
              value={data?.funnel.registration || 0}
              percent={100}
              icon={Users}
              color="#3B82F6"
            />
            <FunnelStep
              label="Первая генерация"
              value={data?.funnel.firstGeneration || 0}
              percent={
                data?.funnel.registration
                  ? Math.round((data.funnel.firstGeneration / data.funnel.registration) * 100)
                  : 0
              }
              icon={Sparkles}
              color="#8B5CF6"
            />
            <FunnelStep
              label="Первая покупка"
              value={data?.funnel.firstPurchase || 0}
              percent={
                data?.funnel.registration
                  ? Math.round((data.funnel.firstPurchase / data.funnel.registration) * 100)
                  : 0
              }
              icon={CreditCard}
              color="#10B981"
            />
            <FunnelStep
              label="Повторная покупка"
              value={data?.funnel.repeatPurchase || 0}
              percent={
                data?.funnel.firstPurchase
                  ? Math.round((data.funnel.repeatPurchase / data.funnel.firstPurchase) * 100)
                  : 0
              }
              icon={Repeat}
              color="#F59E0B"
            />
          </div>

          {/* Funnel Bar */}
          <div className="mt-8 h-12 rounded-xl overflow-hidden flex">
            <div
              className="h-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: "100%" }}
            >
              100%
            </div>
          </div>
          <div className="mt-2 h-10 rounded-xl overflow-hidden flex">
            <div
              className="h-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium transition-all"
              style={{
                width: `${
                  data?.funnel.registration
                    ? (data.funnel.firstGeneration / data.funnel.registration) * 100
                    : 0
                }%`,
              }}
            >
              {data?.funnel.registration
                ? Math.round((data.funnel.firstGeneration / data.funnel.registration) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="mt-2 h-8 rounded-xl overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all"
              style={{
                width: `${
                  data?.funnel.registration
                    ? (data.funnel.firstPurchase / data.funnel.registration) * 100
                    : 0
                }%`,
              }}
            >
              {data?.funnel.registration
                ? Math.round((data.funnel.firstPurchase / data.funnel.registration) * 100)
                : 0}
              %
            </div>
          </div>
          <div className="mt-2 h-6 rounded-xl overflow-hidden flex">
            <div
              className="h-full bg-amber-500 flex items-center justify-center text-white text-xs font-medium transition-all"
              style={{
                width: `${
                  data?.funnel.registration
                    ? (data.funnel.repeatPurchase / data.funnel.registration) * 100
                    : 0
                }%`,
                minWidth: data?.funnel.repeatPurchase ? "40px" : "0",
              }}
            >
              {data?.funnel.registration
                ? Math.round((data.funnel.repeatPurchase / data.funnel.registration) * 100)
                : 0}
              %
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--gold)]" />
            Динамика за {period} дней
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-[var(--muted)]">Пользователи</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-[var(--muted)]">Генерации (÷10)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-[var(--muted)]">Выручка (÷100)</span>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-48 flex items-end gap-1">
            {data?.timeSeries?.map((d, i) => {
              const usersH = maxChartValue > 0 ? (d.users / maxChartValue) * 100 : 0;
              const gensH = maxChartValue > 0 ? (d.generations / 10 / maxChartValue) * 100 : 0;
              const revH = maxChartValue > 0 ? (d.revenue / 100 / maxChartValue) * 100 : 0;

              return (
                <div
                  key={d.date}
                  className="flex-1 flex items-end gap-0.5 group relative"
                  title={`${d.date}\nПользователи: ${d.users}\nГенерации: ${d.generations}\nВыручка: ${d.revenue}`}
                >
                  <div
                    className="flex-1 bg-blue-500/80 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${Math.max(usersH, 2)}%` }}
                  />
                  <div
                    className="flex-1 bg-purple-500/80 rounded-t transition-all hover:bg-purple-500"
                    style={{ height: `${Math.max(gensH, 2)}%` }}
                  />
                  <div
                    className="flex-1 bg-emerald-500/80 rounded-t transition-all hover:bg-emerald-500"
                    style={{ height: `${Math.max(revH, 2)}%` }}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    <div className="font-medium">{new Date(d.date).toLocaleDateString("ru", { day: "numeric", month: "short" })}</div>
                    <div className="text-blue-400">👤 {d.users}</div>
                    <div className="text-purple-400">✨ {d.generations}</div>
                    <div className="text-emerald-400">💰 {d.revenue}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X axis labels */}
          <div className="flex justify-between mt-2 text-xs text-[var(--muted)]">
            <span>
              {data?.timeSeries?.[0]
                ? new Date(data.timeSeries[0].date).toLocaleDateString("ru", { day: "numeric", month: "short" })
                : ""}
            </span>
            <span>
              {data?.timeSeries?.length
                ? new Date(data.timeSeries[data.timeSeries.length - 1].date).toLocaleDateString("ru", {
                    day: "numeric",
                    month: "short",
                  })
                : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>По типу генераций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BreakdownItem
                icon={ImageIcon}
                label="Фото"
                value={data?.breakdown.byType.image || 0}
                total={Object.values(data?.breakdown.byType || {}).reduce((a, b) => a + b, 0)}
                color="bg-blue-500"
              />
              <BreakdownItem
                icon={Video}
                label="Видео"
                value={data?.breakdown.byType.video || 0}
                total={Object.values(data?.breakdown.byType || {}).reduce((a, b) => a + b, 0)}
                color="bg-purple-500"
              />
              <BreakdownItem
                icon={ShoppingBag}
                label="E-Com"
                value={data?.breakdown.byType.product || 0}
                total={Object.values(data?.breakdown.byType || {}).reduce((a, b) => a + b, 0)}
                color="bg-amber-500"
              />
              </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle>По статусу</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BreakdownItem
                icon={CheckCircle}
                label="Успешно"
                value={data?.breakdown.byStatus.success || 0}
                total={Object.values(data?.breakdown.byStatus || {}).reduce((a, b) => a + b, 0)}
                color="bg-emerald-500"
              />
              <BreakdownItem
                icon={XCircle}
                label="Ошибка"
                value={data?.breakdown.byStatus.failed || 0}
                total={Object.values(data?.breakdown.byStatus || {}).reduce((a, b) => a + b, 0)}
                color="bg-red-500"
              />
              <BreakdownItem
                icon={Clock}
                label="В процессе"
                value={(data?.breakdown.byStatus.pending || 0) + (data?.breakdown.byStatus.generating || 0)}
                total={Object.values(data?.breakdown.byStatus || {}).reduce((a, b) => a + b, 0)}
                color="bg-gray-500"
                        />
                      </div>
          </CardContent>
        </Card>
      </div>

      {/* LaoZhang API Stats */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            LaoZhang API (Nano Banana, Veo, Sora)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {laozhangStats ? (
            <div className="space-y-6">
              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <p className="text-2xl font-bold text-[var(--text)]">{laozhangStats.totals.generations}</p>
                  <p className="text-xs text-[var(--muted)]">Всего генераций</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-400">{laozhangStats.totals.success}</p>
                  <p className="text-xs text-[var(--muted)]">Успешных</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-2xl font-bold text-cyan-400">${laozhangStats.totals.costUsd.toFixed(2)}</p>
                  <p className="text-xs text-[var(--muted)]">Потрачено (USD)</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20">
                  <p className="text-2xl font-bold text-[var(--gold)]">{laozhangStats.totals.costRub.toLocaleString("ru")}</p>
                  <p className="text-xs text-[var(--muted)]">Потрачено</p>
                </div>
              </div>
              
              {/* By Model */}
              <div>
                <h4 className="text-sm font-medium text-[var(--muted)] mb-3">По моделям</h4>
                <div className="space-y-2">
                  {laozhangStats.byModel.map((m) => (
                    <div key={m.model} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                          m.model.includes("veo") ? "bg-purple-500/20 text-purple-400" :
                          m.model.includes("sora") ? "bg-blue-500/20 text-blue-400" :
                          m.model.includes("pro") ? "bg-[var(--gold)]/20 text-[var(--gold)]" :
                          "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {m.model.includes("veo") || m.model.includes("sora") ? "🎬" : "🖼️"}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text)]">{m.model}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {m.success} успешных / {m.count} всего
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-cyan-400">${m.costUsd.toFixed(2)}</p>
                        <p className="text-xs text-[var(--muted)]">{m.costRub}</p>
                      </div>
                    </div>
                  ))}
                  {laozhangStats.byModel.length === 0 && (
                    <p className="text-sm text-[var(--muted)] text-center py-4">Нет данных за этот период</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--muted)]">
              Загрузка статистики LaoZhang...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--gold)]" />
            Управление
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink href="/admin/users" icon={Users} label="Пользователи" />
            <QuickLink href="/admin/sales" icon={CreditCard} label="Продажи" />
            <QuickLink href="/admin/gallery" icon={ImageIcon} label="Галерея" />
            <QuickLink href="/admin/promocodes" icon={Star} label="Промокоды" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === COMPONENTS ===

function QuickStat({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: "blue" | "green" | "purple" | "gold";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    gold: "bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/20",
  };

  return (
    <div className={cn("p-4 rounded-xl border", colors[color])}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <div>
          <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
          <p className="text-xs text-[var(--muted)]">{title}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change?: number | null;
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
            {change !== undefined && change !== null && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 text-xs font-medium",
                  change >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(change)}% vs пред. период
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({
  label,
  value,
  percent,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-[var(--text)]">{value.toLocaleString("ru")}</p>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-lg font-semibold mt-1" style={{ color }}>
        {percent}%
      </p>
    </div>
  );
}

function BreakdownItem({
  icon: Icon,
  label,
  value,
  total,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--muted)]" />
          <span className="text-sm font-medium text-[var(--text)]">{label}</span>
        </div>
        <span className="text-sm text-[var(--muted)]">
          {value.toLocaleString("ru")} ({percent}%)
        </span>
      </div>
      <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] hover:border-[var(--gold)]/30 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--surface2)] group-hover:bg-[var(--gold)]/10 flex items-center justify-center transition-colors">
          <Icon className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--gold)]" />
      </div>
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
    </Link>
  );
}
