"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Role = "user" | "manager" | "admin";

type AdminUserRow = {
  display_name: string;
  telegram_id: number | null;
  auth_user_id: string;
  role: Role;
  created_at: string;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type UsersResponse = {
  users: AdminUserRow[];
  limit: number;
  offset: number;
  query: string;
  role: string;
};

function shortUuid(v: string) {
  if (!v) return "";
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

export default function AdminUsersClient() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const fetchUsers = async (nextOffset = offset) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        query,
        role,
        limit: String(limit),
        offset: String(nextOffset),
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || `Failed to load users (${res.status})`;
        setError(msg);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const handleSearch = async () => {
    setOffset(0);
    await fetchUsers(0);
  };

  const handleRoleChange = async (u: AdminUserRow, nextRole: Role) => {
    if (u.role === nextRole) return;
    const ok = confirm(`Сменить роль для ${u.display_name} на ${nextRole}?`);
    if (!ok) return;

    // optimistic
    const prev = data;
    if (data) {
      setData({
        ...data,
        users: data.users.map((x) => (x.auth_user_id === u.auth_user_id ? { ...x, role: nextRole } : x)),
      });
    }

    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: u.auth_user_id, role: nextRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Failed to update role (${res.status})`);
      }
      toast.success("Роль обновлена");
      // refresh to ensure consistency
      await fetchUsers(offset);
    } catch (e) {
      if (prev) setData(prev);
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const columns: Column<AdminUserRow>[] = useMemo(
    () => [
      {
        key: "display_name",
        label: "Пользователь",
        mobileLabel: "Пользователь",
        render: (u) => (
          <div className="space-y-1">
            <div className="text-[var(--text)] font-medium">{u.display_name}</div>
            <div className="text-xs text-[var(--muted)]">{shortUuid(u.auth_user_id)}</div>
          </div>
        ),
      },
      {
        key: "telegram_id",
        label: "TG ID",
        mobileLabel: "TG ID",
        render: (u) => (u.telegram_id ? String(u.telegram_id) : "-"),
        className: "whitespace-nowrap",
      },
      {
        key: "role",
        label: "Роль",
        mobileLabel: "Роль",
        render: (u) => (
          <Badge variant={u.role === "admin" ? "success" : u.role === "manager" ? "outline" : "default"}>
            {u.role}
          </Badge>
        ),
      },
      {
        key: "created_at",
        label: "Регистрация",
        mobileLabel: "Регистрация",
        render: (u) => new Date(u.created_at).toLocaleDateString("ru"),
      },
      {
        key: "actions",
        label: "Действия",
        mobileLabel: "Действия",
        render: (u) => (
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 text-sm text-[var(--text)]"
              value={u.role}
              onChange={(e) => handleRoleChange(u, e.target.value as Role)}
            >
              <option value="user">user</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const hasMore = (data?.users.length || 0) === limit;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Пользователи</h1>
        <p className="text-[var(--muted)]">Управление ролями и доступом</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-[var(--muted)]">Поиск</label>
              <Input
                placeholder="username / имя / TG ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <div className="w-full md:w-56 space-y-2">
              <label className="text-sm text-[var(--muted)]">Роль</label>
              <select
                className="h-10 w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 text-sm text-[var(--text)]"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="all">all</option>
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="user">user</option>
              </select>
            </div>

            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Загрузка..." : "Применить"}
            </Button>
          </div>

          {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
        </CardContent>
      </Card>

      <Card padding="none">
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={data?.users || []}
            isLoading={isLoading}
            getRowKey={(u) => u.auth_user_id}
            emptyMessage="Пользователи не найдены"
          />
        </CardContent>
      </Card>

      {(hasMore || hasPrev) && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={!hasPrev || isLoading}
          >
            ← Назад
          </Button>
          <span className="text-sm text-[var(--muted)]">Показано: {offset + 1} - {offset + (data?.users.length || 0)}</span>
          <Button variant="outline" onClick={() => setOffset(offset + limit)} disabled={!hasMore || isLoading}>
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  );
}


