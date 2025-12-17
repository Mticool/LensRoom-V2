"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email?: string;
  role: "user" | "manager" | "admin";
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function AdminManagersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "admin" | "manager">("all");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/managers", { credentials: "include" });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`Изменить роль на "${newRole}"?`)) return;

    try {
      const res = await fetch("/api/admin/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        throw new Error("Failed to change role");
      }

      await loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    return user.role === filter;
  });

  const columns: Column<User>[] = [
    {
      key: "email",
      label: "Пользователь",
      mobileLabel: "👤",
      render: (item) => (
        <div className="flex items-center gap-3">
          {item.avatar_url ? (
            <img
              src={item.avatar_url}
              alt={item.display_name || item.email}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--surface2)] flex items-center justify-center text-[var(--muted)]">
              {(item.display_name || item.email || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-[var(--text)]">
              {item.display_name || item.email || "Без имени"}
            </div>
            {item.email && item.display_name && (
              <div className="text-xs text-[var(--muted)]">{item.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Роль",
      mobileLabel: "🎭",
      render: (item) => {
        const roleColors = {
          admin: "bg-red-500/20 text-red-400",
          manager: "bg-blue-500/20 text-blue-400",
          user: "bg-gray-500/20 text-gray-400",
        };
        const roleLabels = {
          admin: "👑 Админ",
          manager: "⚡ Менеджер",
          user: "👤 Пользователь",
        };
        return (
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${roleColors[item.role]}`}
          >
            {roleLabels[item.role]}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "Регистрация",
      mobileLabel: "📅",
      render: (item) => new Date(item.created_at).toLocaleDateString("ru"),
    },
    {
      key: "last_sign_in_at",
      label: "Последний вход",
      mobileLabel: "🕐",
      render: (item) =>
        item.last_sign_in_at
          ? new Date(item.last_sign_in_at).toLocaleDateString("ru")
          : "—",
    },
    {
      key: "actions",
      label: "Действия",
      mobileLabel: "⚙️",
      render: (item) => (
        <div className="flex gap-2">
          {item.role !== "manager" && item.role !== "admin" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChangeRole(item.id, "manager")}
              className="text-blue-400 hover:text-blue-300"
            >
              ⚡ Сделать менеджером
            </Button>
          )}
          {item.role === "manager" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChangeRole(item.id, "user")}
              className="text-orange-400 hover:text-orange-300"
            >
              Снять права
            </Button>
          )}
          {item.role !== "admin" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleChangeRole(item.id, "admin")}
              className="text-red-400 hover:text-red-300"
            >
              👑 Сделать админом
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
          Менеджеры и роли
        </h1>
        <p className="text-[var(--muted)]">
          Управление ролями пользователей: админы, менеджеры, пользователи
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted)]">Админы</p>
              <p className="text-3xl font-bold text-red-400">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted)]">Менеджеры</p>
              <p className="text-3xl font-bold text-blue-400">
                {users.filter((u) => u.role === "manager").length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted)]">Пользователи</p>
              <p className="text-3xl font-bold text-[var(--text)]">
                {users.filter((u) => u.role === "user").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          onClick={() => setFilter("all")}
        >
          Все ({users.length})
        </Button>
        <Button
          variant={filter === "admin" ? "default" : "ghost"}
          onClick={() => setFilter("admin")}
        >
          👑 Админы ({users.filter((u) => u.role === "admin").length})
        </Button>
        <Button
          variant={filter === "manager" ? "default" : "ghost"}
          onClick={() => setFilter("manager")}
        >
          ⚡ Менеджеры ({users.filter((u) => u.role === "manager").length})
        </Button>
      </div>

      {/* Таблица */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>
            {filter === "all"
              ? `Все пользователи (${filteredUsers.length})`
              : filter === "admin"
              ? `Админы (${filteredUsers.length})`
              : `Менеджеры (${filteredUsers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)]">Загрузка...</div>
          ) : (
            <AdminTable
              columns={columns}
              data={filteredUsers}
              getRowKey={(item) => item.id}
              emptyMessage="Нет пользователей"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
