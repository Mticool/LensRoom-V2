import { redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";

async function checkAdminAccess() {
  // Allow both admin and manager into the panel; routes will enforce stricter access.
  try {
    const ctx = await requireRole("manager");
    return ctx.session;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await checkAdminAccess();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-lg font-semibold text-[var(--text)]">
                Admin
              </Link>
              <div className="flex gap-1">
                <NavLink href="/admin">Обзор</NavLink>
                <NavLink href="/admin/styles">Стили</NavLink>
                <NavLink href="/admin/content">Контент</NavLink>
                <NavLink href="/admin/users">Пользователи</NavLink>
                <NavLink href="/admin/sales">Продажи</NavLink>
                <NavLink href="/admin/referrals">Рефералы</NavLink>
                <NavLink href="/admin/partners">Партнёры</NavLink>
                <NavLink href="/admin/affiliate-earnings">Комиссии</NavLink>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              ← На сайт
            </Link>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
    >
      {children}
    </Link>
  );
}

