"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Menu lateral recolhível para o celular: um botão "Menu" abre uma gaveta pela
 * esquerda com os links em fileira vertical. Fecha com Esc, tocando fora, no
 * botão de fechar ou ao escolher qualquer link. Só aparece abaixo de md.
 */
export default function MobileMenu({ children, title = "Menu" }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus({ preventScroll: true });
  }, []);

  // Trocou de página: fecha sem roubar o foco.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div className="md:hidden">
      <button
        ref={openerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-ink hover:text-paper"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
        {title}
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-ink/50 transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
          }}
          className={`tv-app absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r-2 border-ink bg-paper px-5 pb-8 pt-4 shadow-2xl shadow-ink/30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="display text-2xl">{title}</span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Fechar menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink text-ink hover:bg-ink hover:text-paper"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1 text-base font-semibold">{children}</div>
        </aside>
      </div>
    </div>
  );
}
