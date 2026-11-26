import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import HintTip from "./HintTip";

/** Número grande com ícone, rótulo e dica opcional (balão ao passar o mouse). */
export default function KpiCard({
  label,
  value,
  hint,
  tip,
  icon: Icon,
  tone = "ink",
  children,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tip?: string;
  icon?: LucideIcon;
  tone?: "ink" | "folha" | "brand" | "sol";
  children?: ReactNode;
}) {
  const accent = { ink: "bg-ink text-paper", folha: "bg-folha text-white", brand: "bg-brand-600 text-white", sol: "bg-sol text-ink" }[tone];
  return (
    <div className="rounded-md border-2 border-ink bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</p>
        {Icon && (
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded ${accent}`}>
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="display mt-1 flex items-center gap-1 text-3xl sm:text-4xl">
        {value}
        {tip && <HintTip text={tip} />}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      {children}
    </div>
  );
}
