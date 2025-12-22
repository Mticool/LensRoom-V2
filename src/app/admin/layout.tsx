"use client";

import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  FileImage,
  FileText,
  Tag,
  Users,
  CreditCard,
  Share2,
  Handshake,
  Coins,
  Clock,
  FolderOpen,
  Sparkles,
  Settings,
  ChevronDown,
  Menu,
  X,
  Star,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Группы навигации
const NAV_GROUPS = [
  {
    title: "Обзор",
    items: [
      { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/styles", label: "Стили", icon: Palette },
      { href: "/admin/content", label: "Галерея", icon: FileImage },
      { href: "/admin/categories", label: "Категории", icon: FolderOpen },
      { href: "/admin/generator", label: "Генератор", icon: Sparkles, badge: "AI" },
      { href: "/admin/articles", label: "Статьи", icon: FileText },
    ],
  },
  {
    title: "Маркетинг",
    items: [
      { href: "/admin/promocodes", label: "Промокоды", icon: Tag },
      { href: "/admin/referrals", label: "Рефералы", icon: Share2 },
      { href: "/admin/partners", label: "Партнёры", icon: Handshake },
      { href: "/admin/affiliate-earnings", label: "Комиссии", icon: Coins },
    ],
  },
  {
    title: "Пользователи",
    items: [
      { href: "/admin/users", label: "Все пользователи", icon: Users },
      { href: "/admin/credits", label: "Начисление ⭐", icon: Star },
      { href: "/admin/sales", label: "Продажи", icon: CreditCard },
      { href: "/admin/waitlist", label: "Waitlist", icon: Clock },
    ],
  },
];

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  isActive,
  collapsed,
}: {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors",
        isActive
          ? "bg-[var(--gold)]/15 text-[var(--gold)]"
          : "text-white/75 hover:text-white hover:bg-[var(--surface2)]",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-[var(--gold)]/20 text-[var(--gold)] rounded">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-[var(--surface)] border-r border-[var(--border)] z-40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)]">
        {!collapsed && (
          <Link href="/admin" className="text-xl font-bold text-white">
            Admin
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-[var(--surface2)]"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-3 mb-2.5 text-[13px] font-semibold text-white/60 uppercase tracking-wider">
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  isActive={
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href)
                  }
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--border)]">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors",
            collapsed && "justify-center"
          )}
        >
          {!collapsed && "← На сайт"}
        </Link>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-50 flex items-center justify-between px-4 lg:hidden">
        <Link href="/admin" className="text-lg font-bold text-[var(--text)]">
          Admin
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)]"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-14 bottom-0 w-72 bg-[var(--surface)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-3 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="px-3 mb-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.href}
                        {...item}
                        isActive={
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href)
                        }
                        collapsed={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-[var(--border)]">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
              >
                ← На сайт
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)] admin-panel">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile nav */}
      <MobileNav />

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "pt-14 lg:pt-0", // Mobile header offset
          collapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {/* Admin panel styles for better readability */}
      <style jsx global>{`
        .admin-panel {
          --text: rgba(255, 255, 255, 0.95);
          --text2: rgba(255, 255, 255, 0.85);
          --muted: rgba(255, 255, 255, 0.72);
          font-size: 15px;
        }
        .admin-panel h1 {
          font-size: 2rem !important;
          font-weight: 700 !important;
        }
        .admin-panel h2, .admin-panel [class*="CardTitle"] {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
        }
        .admin-panel p, .admin-panel span, .admin-panel label {
          font-size: 0.938rem;
        }
        .admin-panel .text-sm {
          font-size: 0.875rem !important;
        }
        .admin-panel .text-xs {
          font-size: 0.8125rem !important;
        }
        .admin-panel input, .admin-panel textarea, .admin-panel select {
          font-size: 0.938rem !important;
        }
        .admin-panel button {
          font-size: 0.938rem !important;
        }
        .admin-panel table {
          font-size: 0.938rem;
        }
        .admin-panel th {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
        }
        .admin-panel td {
          color: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </div>
  );
}
