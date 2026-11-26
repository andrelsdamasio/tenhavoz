"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface PaletteItem {
  label: string;
  href: string;
  hint?: string;
  group: string;
}

/** Atalho de teclado (Ctrl/⌘ + K) para ir direto a qualquer tela. Também abre pelo botão. */
export default function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border-2 border-ink/70 px-2.5 py-1 text-sm font-semibold text-ink hover:bg-paper-deep md:inline-flex"
        aria-label="Ir para… (atalho Ctrl K)"
      >
        Ir para…
        <kbd className="rounded border border-ink/40 px-1 text-xs font-bold">Ctrl K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Ir para uma tela"
        overlayClassName="fixed inset-0 z-[60] bg-ink/50"
        contentClassName="tv-app fixed left-1/2 top-24 z-[61] w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-md border-2 border-ink bg-paper shadow-xl"
      >
        <Command.Input
          placeholder="Digite para buscar uma tela…"
          className="w-full border-b-2 border-ink bg-white px-4 py-3 text-base outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-soft">Nada encontrado.</Command.Empty>
          {groups.map((g) => (
            <Command.Group key={g} heading={g} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-soft">
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <Command.Item
                    key={i.href}
                    value={`${i.label} ${i.hint ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(i.href);
                    }}
                    className="flex cursor-pointer flex-col rounded px-3 py-2 text-sm font-semibold data-[selected=true]:bg-ink data-[selected=true]:text-paper"
                  >
                    {i.label}
                    {i.hint && <span className="text-xs font-normal opacity-70">{i.hint}</span>}
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
