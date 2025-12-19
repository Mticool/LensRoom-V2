"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";

interface InviteeInfo {
  invitee_user_id: string;
  invitee: {
    telegram_id: number;
    username: string | null;
    name: string;
  } | null;
  purchases: number;
  revenue_rub: number;
}

interface ReferralRow {
  inviter_user_id: string;
  inviter: {
    telegram_id: number;
    username: string | null;
    name: string;
  } | null;
  invited_count: number;
  earned_stars: number;
  invitees: InviteeInfo[];
  purchases_count: number;
  revenue_rub: number;
}

interface ReferralsData {
  inviter_bonus_stars: number;
  total_referrals: number;
  rows: ReferralRow[];
}

export default function AdminReferralsPage() {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/referrals", { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<ReferralRow>[] = [
    {
      key: "inviter",
      label: "Реферер",
      mobileLabel: "Реферер",
      render: (item) => {
        if (item.inviter?.username) return `@${item.inviter.username}`;
        if (item.inviter?.name) return item.inviter.name;
        if (item.inviter?.telegram_id) return `TG ${item.inviter.telegram_id}`;
        return item.inviter_user_id;
      },
    },
    {
      key: "invited_count",
      label: "Приглашено",
      mobileLabel: "Приглашено",
    },
    {
      key: "earned_stars",
      label: "Заработано",
      mobileLabel: "⭐",
      render: (item) => `${item.earned_stars.toLocaleString("ru")} ⭐`,
    },
    {
      key: "purchases_count",
      label: "Покупок",
      mobileLabel: "Покупок",
      render: (item) => item.purchases_count || 0,
    },
    {
      key: "revenue_rub",
      label: "Выручка от рефов",
      mobileLabel: "₽ от рефов",
      render: (item) => `${item.revenue_rub.toLocaleString("ru")} ₽`,
    },
  ];

  const totalInviters = data?.rows.length || 0;
  const totalStarsEarned =
    data?.rows.reduce((sum, r) => sum + r.earned_stars, 0) || 0;
  const totalRevenue =
    data?.rows.reduce((sum, r) => sum + r.revenue_rub, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Рефералы</h1>
        <p className="text-[var(--muted)]">
          Всего рефералов: {data?.total_referrals || 0}
        </p>
      </div>

      {/* Summary */}
      {data && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Бонус за реферала</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {data.inviter_bonus_stars} ⭐
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Активных рефереров</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalInviters}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Выдано звёзд</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalStarsEarned.toLocaleString("ru")} ⭐
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[var(--muted)] mb-2">Выручка от рефералов</p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalRevenue.toLocaleString("ru")} ₽
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Рефереры</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={data?.rows || []}
            isLoading={isLoading}
            getRowKey={(item) => item.inviter_user_id}
            emptyMessage="Нет рефералов"
          />
        </CardContent>
      </Card>

      {/* Expandable details for invitees (optional enhancement) */}
      {data && !isLoading && expandedRow && (
        <Card>
          <CardHeader>
            <CardTitle>Детали приглашённых</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.rows
                .find((r) => r.inviter_user_id === expandedRow)
                ?.invitees.map((invitee, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-lg bg-[var(--surface2)]"
                  >
                    <span className="text-sm text-[var(--text)]">
                      {invitee.invitee?.username
                        ? `@${invitee.invitee.username}`
                        : invitee.invitee?.name || invitee.invitee_user_id}
                    </span>
                    <div className="flex gap-4 text-sm text-[var(--muted)]">
                      <span>Покупок: {invitee.purchases}</span>
                      <span>
                        {invitee.revenue_rub.toLocaleString("ru")} ₽
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


