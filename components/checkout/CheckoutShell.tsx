import { Check, Lock, QrCode, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { buildWhatsAppSupportUrl } from "@/lib/support";

export interface SummaryLine {
  label: string;
  value: string;
}

const STEPS = ["Pedido", "Pagamento", "Pronto"];

/**
 * Moldura única de pagamento do TenhaVoz: campanha, doação e anúncio passam por
 * ela. Mesma ordem, mesmas garantias à vista — é isso que dá confiança.
 */
export default function CheckoutShell({
  step,
  title,
  lines,
  totalLabel = "Total",
  totalValue,
  perks,
  children,
  userEmail,
}: {
  step: 1 | 2 | 3;
  title: string;
  lines: SummaryLine[];
  totalLabel?: string;
  totalValue: string;
  perks?: string[];
  children: ReactNode;
  userEmail?: string | null;
}) {
  return (
    <div className="tv-app mx-auto w-full max-w-4xl px-4 py-6">
      <ol aria-label="Etapas" className="mb-6 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
        {STEPS.map((name, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={name} aria-current={current ? "step" : undefined} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink text-[11px] ${
                  done ? "bg-folha text-white" : current ? "bg-sol text-ink" : "bg-paper text-ink-soft"
                }`}
              >
                {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={current ? "text-ink" : "text-ink-soft"}>{name}</span>
              {n < STEPS.length && <span aria-hidden="true" className="mx-1 h-0.5 w-6 bg-ink/20" />}
            </li>
          );
        })}
      </ol>

      <h1 className="display mb-5 text-3xl sm:text-4xl">{title}</h1>

      <div className="grid gap-5 md:grid-cols-[1fr_20rem]">
        <section aria-label="Pagamento" className="order-2 min-w-0 rounded-md border-2 border-ink bg-white p-4 sm:p-5 md:order-1">
          {children}
        </section>

        <aside aria-label="Resumo do pedido" className="order-1 h-fit rounded-md border-2 border-ink bg-paper-deep/60 p-4 md:order-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Resumo</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            {lines.map((l) => (
              <div key={l.label} className="flex justify-between gap-3">
                <dt className="text-ink-soft">{l.label}</dt>
                <dd className="text-right font-semibold [overflow-wrap:anywhere]">{l.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink pt-3">
            <span className="text-sm font-extrabold">{totalLabel}</span>
            <span className="display text-3xl">{totalValue}</span>
          </div>
          {perks && perks.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-ink-soft">
              {perks.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-folha" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <ul className="mt-6 grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-4">
        {[
          { icon: Lock, t: "Pagamento seguro", d: "Processado pelo Mercado Pago. O TenhaVoz não guarda dados de cartão." },
          { icon: Zap, t: "Pix confirma na hora", d: "Pagou, a tela avisa em segundos. Sem esperar e-mail." },
          { icon: ShieldCheck, t: "Seus dados protegidos", d: "Usamos o e-mail só para recibo e avisos. Nada de spam." },
          { icon: QrCode, t: "Ajuda de verdade", d: "Deu algo errado? Fale com a gente no WhatsApp." },
        ].map(({ icon: Icon, t, d }) => (
          <li key={t} className="flex gap-2 rounded-md border-2 border-ink/15 bg-white p-3">
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-folha" />
            <span>
              <strong className="block text-sm">{t}</strong>
              <span className="text-ink-soft">{d}</span>
              {t === "Ajuda de verdade" && (
                <a href={buildWhatsAppSupportUrl(userEmail)} target="_blank" rel="noopener noreferrer" className="mt-1 block font-semibold underline underline-offset-4">
                  Abrir WhatsApp
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
