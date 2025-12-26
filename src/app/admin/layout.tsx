"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileImage,
  Tag,
  Users,
  CreditCard,
  Share2,
  Coins,
  Star,
  Menu,
  X,
  ChevronLeft,
  Settings,
  LogOut,
  Send,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Упрощённая навигация
const NAV_GROUPS = [
  {
    title: "Главное",
    items: [
      { href: "/admin", label: "Аналитика", icon: LayoutDashboard },
      { href: "/admin/users", label: "Пользователи", icon: Users },
      { href: "/admin/sales", label: "Продажи", icon: CreditCard },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/gallery", label: "Галерея", icon: FileImage },
      { href: "/admin/styles", label: "Стили AI", icon: Star, badge: "AI" },
    ],
  },
  {
    title: "Маркетинг",
    items: [
      { href: "/admin/broadcast", label: "Рассылки", icon: Send, badge: "NEW" },
      { href: "/admin/promocodes", label: "Промокоды", icon: Tag },
      { href: "/admin/referrals", label: "Рефералы", icon: Share2 },
      { href: "/admin/credits", label: "Начисление ⭐", icon: Coins },
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
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all",
        isActive
          ? "bg-[var(--gold)]/15 text-[var(--gold)] shadow-[0_0_12px_rgba(255,215,0,0.1)]"
          : "text-white/70 hover:text-white hover:bg-white/5",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-[var(--gold)]")} />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--gold)]/20 text-[var(--gold)] rounded">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  userRole,
}: {
  collapsed: boolean;
  onToggle: () => void;
  userRole: "user" | "manager" | "admin" | null;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-gradient-to-b from-[#0D0D0F] to-[#131316] border-r border-white/5 z-40 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <span className="text-black font-bold text-sm">LR</span>
            </div>
            <span className="text-lg font-bold text-white">Admin</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          // Filter for managers - only show styles
          const visibleItems =
            userRole === "manager"
              ? group.items.filter(
                  (item) =>
                    item.href === "/admin/styles" ||
                    item.href === "/admin/gallery" ||
                    item.href === "/admin"
                )
              : userRole === "admin"
              ? group.items
              : [];

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {!collapsed && (
                <div className="px-3 mb-2.5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    isActive={
                      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
                    }
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>На сайт</span>}
        </Link>
      </div>
    </aside>
  );
}

function MobileNav({ userRole }: { userRole: "user" | "manager" | "admin" | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0D0D0F] border-b border-white/5 z-50 flex items-center justify-between px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--gold)] flex items-center justify-center">
            <span className="text-black font-bold text-xs">LR</span>
          </div>
          <span className="font-bold text-white">Admin</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-white/70 hover:text-white"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-14 bottom-0 w-72 bg-[#0D0D0F] overflow-y-auto animate-in slide-in-from-left"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-4 space-y-6">
              {NAV_GROUPS.map((group) => {
                const visibleItems =
                  userRole === "manager"
                    ? group.items.filter(
                        (item) =>
                          item.href === "/admin/styles" ||
                          item.href === "/admin/gallery" ||
                          item.href === "/admin"
                      )
                    : userRole === "admin"
                    ? group.items
                    : [];

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.title}>
                    <div className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {visibleItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors",
                            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                              ? "bg-[var(--gold)]/15 text-[var(--gold)]"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/5">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                На сайт
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
  const [userRole, setUserRole] = useState<"user" | "manager" | "admin" | null>(null);

  // Load user role
  useEffect(() => {
    fetch("/api/auth/role", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUserRole(data.role))
      .catch(() => setUserRole("user"));
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] admin-panel">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} userRole={userRole} />
      </div>

      {/* Mobile nav */}
      <MobileNav userRole={userRole} />

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          "pt-14 lg:pt-0",
          collapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</div>
      </main>

      {/* Admin panel styles */}
      <style jsx global>{`
        .admin-panel {
          --text: rgba(255, 255, 255, 0.95);
          --text2: rgba(255, 255, 255, 0.85);
          --muted: rgba(255, 255, 255, 0.55);
          --surface: #131316;
          --surface2: #1A1A1E;
          --border: rgba(255, 255, 255, 0.08);
          --gold: #FFD700;
          font-size: 15px;
        }
        .admin-panel h1 {
          font-size: 1.875rem !important;
          font-weight: 700 !important;
        }
        .admin-panel h2,
        .admin-panel [class*="CardTitle"] {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
        }
        .admin-panel .text-sm {
          font-size: 0.875rem !important;
        }
        .admin-panel .text-xs {
          font-size: 0.75rem !important;
        }
      `}</style>
    </div>
  );
}
