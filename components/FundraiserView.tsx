import type { ReactNode } from "react";
import { formatCentsBRL } from "@/lib/fundraisers";
import { deriveThemeShades, isValidHexColor, themeShadesToCssVars } from "@/lib/color";

export const FUNDRAISER_THEMES: { id: number; name: string }[] = [
  { id: 1, name: "Clássico" },
  { id: 2, name: "Destaque" },
  { id: 3, name: "Cartão" },
];

export interface ViewBudgetItem {
  id: string;
  label: string;
  amount_cents: number;
  description?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export interface ViewDonation {
  id: string;
  name: string;
  amount_cents: number;
  message: string | null;
  when: string;
}

export interface FundraiserViewProps {
  templateId: number;
  color: string | null;
  title: string;
  beneficiary: string | null;
  summary: string | null;
  story: string;
  goalCents: number;
  raisedCents: number;
  donationCount: number;
  daysLeft: number | null;
  budget: ViewBudgetItem[];
  donations: ViewDonation[];
  /** Formulário de doação (na prévia, um bloco estático). */
  donateSlot: ReactNode;
  shareSlot?: ReactNode;
  notice?: string | null;
}

function pctOf(raised: number, goal: number) {
  return goal <= 0 ? 0 : Math.min(100, Math.floor((raised / goal) * 100));
}

function Progress({ p, raised, goal, count, left }: { p: number; raised: number; goal: number; count: number; left: number | null }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-2xl font-bold" style={{ color: "var(--tc-on-text)" }}>{formatCentsBRL(raised)}</p>
        <p className="text-sm text-gray-600">arrecadados de {formatCentsBRL(goal)}</p>
      </div>
      <div role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta" className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: "var(--tc-base)" }} />
      </div>
      <p className="flex justify-between text-sm text-gray-700">
        <span>{p}% da meta</span>
        <span>{count} {count === 1 ? "doação" : "doações"}</span>
      </p>
      {left !== null && <p className="text-sm text-gray-700">{left === 0 ? "Prazo encerrado" : `Faltam ${left} ${left === 1 ? "dia" : "dias"}`}</p>}
    </div>
  );
}

function Budget({ items }: { items: ViewBudgetItem[] }) {
  if (items.length === 0) return null;
  const total = items.reduce((s, b) => s + b.amount_cents, 0);
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm" aria-labelledby="orcamento">
      <h2 id="orcamento" className="mb-1 text-lg font-semibold">Para que será usado</h2>
      <p className="mb-3 text-sm text-gray-600">Previsão de gastos informada por quem criou a campanha.</p>
      <ul className="divide-y divide-gray-100">
        {items.map((b) => (
          <li key={b.id} className="py-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{b.label}</span>
              <span className="shrink-0 font-medium">{formatCentsBRL(b.amount_cents)}</span>
            </div>
            {b.description && <p className="mt-0.5 text-gray-600">{b.description}</p>}
            {b.attachment_url && (
              <a href={b.attachment_url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline" style={{ color: "var(--tc-on-text)" }}>
                📎 {b.attachment_name ?? "Ver documento"}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
        <span>Total previsto</span>
        <span>{formatCentsBRL(total)}</span>
      </p>
    </section>
  );
}

function Donors({ donations, count }: { donations: ViewDonation[]; count: number }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm" aria-labelledby="doadores">
      <h2 id="doadores" className="mb-3 text-lg font-semibold">Quem já ajudou ({count})</h2>
      {donations.length === 0 ? (
        <p className="text-sm text-gray-600">Seja a primeira pessoa a ajudar.</p>
      ) : (
        <ul className="space-y-3">
          {donations.map((d) => (
            <li key={d.id} className="text-sm">
              <p>
                <span className="font-medium">{d.name}</span> doou <span className="font-medium">{formatCentsBRL(d.amount_cents)}</span>{" "}
                <span className="text-gray-500">· {d.when}</span>
              </p>
              {d.message && <p className="mt-0.5 text-gray-600">“{d.message}”</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A página pública da campanha — usada de verdade e na prévia do formulário. */
export default function FundraiserView(props: FundraiserViewProps) {
  const color = props.color && isValidHexColor(props.color) ? props.color : "#1d4ed8";
  const vars = themeShadesToCssVars(deriveThemeShades(color));
  const p = pctOf(props.raisedCents, props.goalCents);
  const theme = props.templateId;

  const progress = <Progress p={p} raised={props.raisedCents} goal={props.goalCents} count={props.donationCount} left={props.daysLeft} />;
  const donateBox = (
    <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      {theme !== 2 && progress}
      {props.donateSlot}
      <p className="text-xs text-gray-500">
        O dinheiro vai direto para a conta Mercado Pago de quem criou a campanha. O TenhaVoz não guarda o valor das doações.
      </p>
      {props.shareSlot && (
        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-sm font-medium">Compartilhe</p>
          {props.shareSlot}
        </div>
      )}
    </div>
  );
  const story = (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">A história</h2>
      <div className="space-y-3 whitespace-pre-line text-gray-800">{props.story}</div>
    </section>
  );
  const summary = props.summary ? <p className="rounded-lg bg-white p-4 text-lg text-gray-800 shadow-sm">{props.summary}</p> : null;

  return (
    <div style={vars as React.CSSProperties} className="bg-gray-50 pb-10">
      {props.notice && (
        <p role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">{props.notice}</p>
      )}

      {theme === 2 && (
        <header className="px-4 py-10 text-center" style={{ background: "var(--tc-base)", color: "var(--tc-on)" }}>
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-extrabold sm:text-4xl">{props.title}</h1>
            {props.beneficiary && <p className="mt-2 text-sm opacity-90">Para: {props.beneficiary}</p>}
            <div className="mx-auto mt-6 max-w-md rounded-lg bg-white p-4 text-left text-gray-900 shadow">{progress}</div>
          </div>
        </header>
      )}

      <div className={`mx-auto px-4 py-8 ${theme === 3 ? "max-w-2xl" : "max-w-5xl"}`}>
        {theme !== 2 && (
          <div className={theme === 3 ? "text-center" : ""}>
            <h1 className="text-2xl font-bold sm:text-3xl">{props.title}</h1>
            {props.beneficiary && <p className="mt-1 text-sm text-gray-600">Para: {props.beneficiary}</p>}
          </div>
        )}

        {theme === 3 ? (
          <div className="mt-6 space-y-6">
            {donateBox}
            {summary}
            {story}
            <Budget items={props.budget} />
            <Donors donations={props.donations} count={props.donationCount} />
          </div>
        ) : (
          <div className={`grid gap-6 lg:grid-cols-[1fr_340px] ${theme === 2 ? "" : "mt-6"}`}>
            <div className="space-y-6">
              {summary}
              {story}
              <Budget items={props.budget} />
              <Donors donations={props.donations} count={props.donationCount} />
            </div>
            <aside className="lg:sticky lg:top-4 lg:self-start">{donateBox}</aside>
          </div>
        )}
      </div>
    </div>
  );
}
