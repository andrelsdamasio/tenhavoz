"use client";

import { useEffect, useState, type ReactNode } from "react";

const TONES = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

interface FlashMessageProps {
  tone: keyof typeof TONES;
  children: ReactNode;
  /** Some sozinho depois deste tempo (ms). Erros não somem sozinhos. */
  autoHideMs?: number;
  /** Parâmetros da URL que originaram o aviso: saem da barra para não reaparecer ao recarregar. */
  clearParams?: string[];
}

/** Aviso de resultado ("salvo!", "erro") que pode ser fechado e não volta ao recarregar. */
export default function FlashMessage({ tone, children, autoHideMs, clearParams = [] }: FlashMessageProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (clearParams.length > 0) {
      try {
        const url = new URL(window.location.href);
        clearParams.forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        // sem problema: o aviso só reaparece se a página for recarregada
      }
    }
    if (!autoHideMs) return;
    const timer = setTimeout(() => setOpen(false), autoHideMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${TONES[tone]}`}
    >
      <p>{children}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Fechar aviso"
        className="shrink-0 rounded px-1 text-lg leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
