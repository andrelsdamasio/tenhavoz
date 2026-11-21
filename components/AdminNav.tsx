"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavItem {
  href: string;
  label: string;
  hint: string;
  badge?: number;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Menu lateral do admin (vira uma barra rolável no celular). */
export default function AdminNav({ items, vertical = false }: { items: AdminNavItem[]; vertical?: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Menu do admin" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${vertical ? "text-base" : "text-sm"} ${
              active
                ? "bg-ink font-bold text-paper"
                : "font-semibold text-ink hover:bg-paper-deep"
            }`}
          >
            <span>
              {item.label}
              <span className={`block text-xs ${active ? "text-paper/70" : "text-ink-soft"}`}>
                {item.hint}
              </span>
            </span>
            {item.badge ? (
              <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
