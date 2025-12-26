"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

const footerLinks = {
  product: [
    { label: "AI Фото", href: "/create" },
    { label: "AI Видео", href: "/create/video" },
    { label: "E-Com Studio", href: "/create/products" },
  ],
  resources: [
    { label: "Библиотека", href: "/library" },
    { label: "Галерея", href: "/inspiration" },
    { label: "Тарифы", href: "/pricing" },
  ],
  company: [
    { label: "О нас", href: "/about" },
    { label: "Поддержка", href: "mailto:mti2324@gmail.com" },
    { label: "Telegram", href: "https://t.me/LensRoom_bot" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold text-[var(--text)]">LensRoom</span>
            </Link>
            <p className="text-sm text-[var(--text2)]">
              AI платформа для создания контента
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Продукты</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Ресурсы</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Компания</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted)]">
            © {new Date().getFullYear()} LensRoom
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-[var(--muted)] hover:text-[var(--text2)] transition-colors"
            >
              Условия
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-[var(--muted)] hover:text-[var(--text2)] transition-colors"
            >
              Приватность
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
