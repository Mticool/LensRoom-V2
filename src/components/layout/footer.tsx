"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

const footerLinks = {
  product: [
    { label: "AI Фото", href: "/create" },
    { label: "AI Видео", href: "/create/video" },
    { label: "Продуктовые карточки", href: "/create/products" },
  ],
  resources: [
    { label: "Библиотека", href: "/library" },
    { label: "Галерея", href: "/inspiration" },
    { label: "Тарифы", href: "/pricing" },
  ],
  company: [
    { label: "О нас", href: "/" },
    { label: "Поддержка", href: "mailto:support@lensroom.ru" },
    { label: "Telegram", href: "https://t.me/lensroom" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-purple-500)] to-[var(--color-blue-500)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[var(--color-text-primary)]">LensRoom</span>
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)]">
              AI платформа для создания контента
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Продукты</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Ресурсы</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Компания</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            © {new Date().getFullYear()} LensRoom
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Условия
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Приватность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
