"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WhatsNewEntry } from "@/lib/whats-new";

const STORAGE_KEY = "tenhavoz:whats-new-seen";

function readSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return null; // sem armazenamento: não incomoda a pessoa a cada visita
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignora
  }
}

/**
 * Botão "Novidades" (com bolinha quando há algo não visto) + pop-up que abre
 * sozinho uma vez para cada novidade nova.
 */
export default function WhatsNew({
  entries,
  popupOnly = false,
}: {
  entries: WhatsNewEntry[];
  /** Página inicial: sem botão; o pop-up abre sozinho uma vez para cada novidade, para qualquer visitante. */
  popupOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const seen = readSeen();
    if (seen === null) return;
    const unseen = entries.some((e) => !seen.includes(e.id));
    if (!unseen) return;
    if (!popupOnly) {
      setHasUnseen(true);
      setOpen(true);
      return;
    }
    setOpen(true);
  }, [entries, popupOnly]);

  const close = useCallback(() => {
    setOpen(false);
    setHasUnseen(false);
    writeSeen(entries.map((e) => e.id));
    openerRef.current?.focus();
  }, [entries]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (entries.length === 0) return null;

  return (
    <>
      {!popupOnly && (
      <button
        type="button"
        onClick={(e) => {
          openerRef.current = e.currentTarget;
          setOpen(true);
        }}
        className="relative hover:underline"
      >
        Novidades
        {hasUnseen && (
          <span
            className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-red-500"
            aria-label="Há novidades que você ainda não viu"
          />
        )}
      </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whats-new-title"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 id="whats-new-title" className="text-lg font-semibold">
              {entries[0]!.title}
            </h2>
            {entries.map((entry, i) => (
              <section key={entry.id} className={i > 0 ? "mt-5 border-t border-gray-100 pt-4" : "mt-3"}>
                {i > 0 && <h3 className="mb-2 text-sm font-semibold text-gray-700">{entry.title}</h3>}
                <ul className="space-y-3">
                  {entry.items.map((item) => (
                    <li key={item.title} className="text-sm">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-gray-600">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-md bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
