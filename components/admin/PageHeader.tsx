import type { ReactNode } from "react";

/** Cabeçalho padrão das telas do admin: título, descrição e ações à direita. */
export default function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-4">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
