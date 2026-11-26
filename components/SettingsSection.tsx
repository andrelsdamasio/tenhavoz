import type { ReactNode } from "react";

export const settingsInput =
  "mt-1 w-full rounded-md border-2 border-ink/70 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";

/** Cartão de uma seção das Configurações do admin (ancorado por id para o menu lateral). */
export default function SettingsSection({
  id,
  title,
  description,
  badge,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 rounded-md border-2 border-ink bg-white p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b-2 border-ink/10 pb-3">
        <div>
          <h2 id={`${id}-t`} className="display text-2xl">
            {title}
          </h2>
          {description && <p className="mt-1 max-w-prose text-sm text-ink-soft">{description}</p>}
        </div>
        {badge}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function StatusPill({ on, onLabel = "Ativo", offLabel = "Desligado" }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return (
    <span
      className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold uppercase ${
        on ? "border-folha bg-folha/10 text-folha" : "border-ink/40 text-ink-soft"
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}
