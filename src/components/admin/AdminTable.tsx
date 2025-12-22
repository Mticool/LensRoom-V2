"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobileLabel?: string; // For mobile card view
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  getRowKey: (item: T) => string | number;
}

export function AdminTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = "Нет данных",
  getRowKey,
}: AdminTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-[var(--surface)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <p className="text-[var(--muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--surface2)] border-b border-[var(--border)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-4 text-left text-sm font-semibold text-[var(--text)]",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map((item) => (
              <tr
                key={getRowKey(item)}
                className="hover:bg-[var(--surface2)] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-6 py-4 text-sm text-[var(--text2)]",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as any)[col.key] || "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <div
            key={getRowKey(item)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between items-start gap-4">
                <span className="text-sm text-[var(--muted)] min-w-[100px]">
                  {col.mobileLabel || col.label}
                </span>
                <span className="text-sm text-[var(--text)] text-right flex-1">
                  {col.render
                    ? col.render(item)
                    : String((item as any)[col.key] || "-")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}


