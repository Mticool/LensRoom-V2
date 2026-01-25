"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface Sale {
  id: string;
  user: {
    telegram_id?: number;
    username?: string;
    name?: string;
    user_id?: string;
  };
  packId: string | null;
  rub: number;
  stars: number;
  type: string;
  status: string;
  created_at: string;
}

interface SalesData {
  from: string;
  to: string;
  sales: Sale[];
}

interface ErrorResponse {
  error: string;
  hint?: string;
  missing?: string[];
}

export default function AdminSalesPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // Date filters (last 7 days by default)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchSales = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/admin/sales?${params}`, { credentials: "include" });
      const json = await res.json();
      
      if (!res.ok) {
        setError(json as ErrorResponse);
        setData(null);
        return;
      }
      
      setData(json);
    } catch (e) {
      console.error("[AdminSales] Fetch error:", e);
      setError({ error: "Не удалось загрузить данные" });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<Sale>[] = [
    {
      key: "created_at",
      label: "Дата",
      mobileLabel: "Дата",
      render: (item) => new Date(item.created_at).toLocaleString("ru"),
    },
    {
      key: "user",
      label: "Пользователь",
      mobileLabel: "Пользователь",
      render: (item) => {
        if (item.user.username) return `@${item.user.username}`;
        if (item.user.name) return item.user.name;
        if (item.user.telegram_id) return `TG ${item.user.telegram_id}`;
        return item.user.user_id || "-";
      },
    },
    {
      key: "packId",
      label: "Пакет",
      mobileLabel: "Пакет",
      render: (item) => item.packId || "-",
    },
    {
      key: "stars",
      label: "Звёзд",
      mobileLabel: "⭐",
      render: (item) => `${item.stars.toLocaleString("ru")} ⭐`,
    },
    {
      key: "status",
      label: "Статус",
      mobileLabel: "Статус",
      render: (item) => (
        <Badge variant={item.status === "completed" ? "success" : "outline"}>
          {item.status}
        </Badge>
      ),
    },
  ];

  const totalStars = data?.sales.reduce((sum, s) => sum + s.stars, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Продажи</h1>
        <p className="text-[var(--muted)]">История транзакций</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-[var(--muted)]">От</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm text-[var(--muted)]">До</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchSales} disabled={isLoading}>
              {isLoading ? "Загрузка..." : "Применить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-400">{error.error}</p>
                {error.hint && (
                  <p className="text-sm text-[var(--muted)] mt-1">{error.hint}</p>
                )}
                {error.missing && error.missing.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-[var(--muted)]">Отсутствующие поля:</p>
                    <ul className="text-xs text-red-400/70 mt-1">
                      {error.missing.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {data && !isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Всего продаж</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {data.sales.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Звёзд продано</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalStars.toLocaleString("ru")} ⭐
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Транзакции</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={data?.sales || []}
            isLoading={isLoading}
            getRowKey={(item) => item.id}
            emptyMessage="Нет транзакций за выбранный период"
          />
        </CardContent>
      </Card>
    </div>
  );
}


