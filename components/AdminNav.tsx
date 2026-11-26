"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercent, CreditCard, HandCoins, LayoutDashboard, type LucideIcon, Mail, MessageSquareWarning, Settings } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  hint: string;
  badge?: number;
  /** Título do grupo em que o item aparece. */
  group?: string;
}

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/inbox": Mail,
  "/admin/comments": MessageSquareWarning,
  "/admin/reports": CreditCard,
  "/admin/arrecadacoes": HandCoins,
  "/admin/coupons": BadgePercent,
  "/admin/settings": Settings,
};

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Menu lateral do admin (vira uma barra rolável no celular). */
export default function AdminNav({ items, vertical = false }: { items: AdminNavItem[]; vertical?: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Menu do admin" className="flex flex-col gap-1">
      {items.map((item, index) => {
        const active = isActive(pathname, item.href);
        const showGroup = item.group && item.group !== items[index - 1]?.group;
        return (
          <div key={item.href} className="flex flex-col gap-1">
            {showGroup && (
              <p className={`px-3 text-xs font-extrabold uppercase tracking-wide text-ink-soft ${index > 0 ? "mt-3" : ""}`}>
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${vertical ? "text-base" : "text-sm"} ${
                active ? "bg-ink font-bold text-paper" : "font-semibold text-ink hover:bg-paper-deep"
              }`}
            >
              <span className="flex items-center gap-2.5">
                {(() => {
                  const Icon = ICONS[item.href];
                  return Icon ? <Icon aria-hidden="true" className="h-5 w-5 shrink-0" /> : null;
                })()}
                <span>
                {item.label}
                <span className={`block text-xs ${active ? "text-paper/70" : "text-ink-soft"}`}>{item.hint}</span>
                </span>
              </span>
              {item.badge ? (
                <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">{item.badge}</span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
