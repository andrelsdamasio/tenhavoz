import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { releasePaymentAction } from "@/app/admin/actions";
import { auditMercadoPagoPayments, type AuditStatus } from "@/lib/payment-audit";
import { getSalesReport, type ReportGranularity } from "@/lib/reports";
import {
  CAMPAIGN_FILTERS,
  EXPIRING_SOON_HOURS,
  getAdminDashboard,
  getRowDetails,
  matchesFilter,
  parseFilter,
  type Billing,
  type CampaignFilter,
  type ClassifiedCampaign,
  type Lifecycle,
} from "@/lib/admin-dashboard";

const PAGE_SIZE = 20;
const TIME_ZONE = "America/Sao_Paulo";

function formatBRLFromReais(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatTimeLeft(ms: number): string {
  const hours = ms / (60 * 60 * 1000);
  if (hours < 1) return "menos de 1 h";
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} dias`;
}

function formatPeriodLabel(period: string, granularity: ReportGranularity): string {
  if (granularity === "day") {
    return new Date(`${period}T00:00:00`).toLocaleDateString("pt-BR");
  }
  if (granularity === "month") {
    const [year, month] = period.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }
  return period;
}

const GRANULARITIES: { value: ReportGranularity; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const FILTER_LABEL: Record<CampaignFilter, string> = {
  all: "Todas",
  active: "Ativas",
  expiring: `Encerrando em ${EXPIRING_SOON_HOURS}h`,
  expired: "Vencidas",
  draft: "Rascunhos",
  paid: "Pagas",
  free: "Grátis",
  refunded: "Reembolsadas",
};

const LIFECYCLE_BADGE: Record<Lifecycle, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-yellow-100 text-yellow-800" },
  publishing: { label: "Publicando", className: "bg-blue-100 text-blue-800" },
  active: { label: "Ativa", className: "bg-green-100 text-green-800" },
  expired: { label: "Vencida", className: "bg-gray-200 text-gray-700" },
};

const BILLING_BADGE: Record<Billing, { label: string; className: string }> = {
  unpaid: { label: "Não paga", className: "bg-gray-100 text-gray-600" },
  paid: { label: "Paga", className: "bg-emerald-100 text-emerald-800" },
  free: { label: "Grátis", className: "bg-violet-100 text-violet-800" },
  refunded: { label: "Reembolsada", className: "bg-red-100 text-red-700" },
};

const AUDIT_LABEL: Record<Exclude<AuditStatus, "ok">, string> = {
  release: "Pago, mas a página não foi liberada",
  campaign_deleted: "Pago, mas a campanha foi apagada",
  no_reference: "Pago fora do checkout do site",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string | number;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${valueClassName}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Barra empilhada com legenda em texto (a cor sozinha não carrega o significado). */
function DistributionBar({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; value: number; barClassName: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-gray-700">{title}</p>
      {total === 0 ? (
        <p className="text-xs text-gray-500">Nada para mostrar ainda.</p>
      ) : (
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
          {segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                className={s.barClassName}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${s.value}`}
              />
            ))}
        </div>
      )}
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.barClassName}`} />
            {s.label}: <strong className="text-gray-900">{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function deadlineLabel(campaign: ClassifiedCampaign): string {
  if (campaign.lifecycle === "draft" || campaign.lifecycle === "publishing") return "—";
  if (campaign.msUntilExpiry === null || !campaign.expires_at) return "Sem prazo";
  if (campaign.msUntilExpiry <= 0) return `Venceu em ${formatDate(campaign.expires_at)}`;
  return `${formatDate(campaign.expires_at)} (faltam ${formatTimeLeft(campaign.msUntilExpiry)})`;
}

interface PageProps {
  searchParams: Promise<{ granularity?: string; filter?: string; page?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { granularity: granularityRaw, filter: filterRaw, page: pageRaw } = await searchParams;
  const granularity: ReportGranularity =
    granularityRaw === "day" || granularityRaw === "year" ? granularityRaw : "month";
  const filter = parseFilter(filterRaw);

  const admin = createAdminClient();
  const [{ rows, summary }, dashboard, audit] = await Promise.all([
    getSalesReport(admin, granularity),
    getAdminDashboard(admin),
    auditMercadoPagoPayments(admin),
  ]);
  const problems = audit.rows.filter((r) => r.status !== "ok");
  const { overview, totals } = dashboard;

  const filtered = dashboard.campaigns.filter((c) => matchesFilter(c, filter));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(pageRaw ?? "1", 10);
  const page = Math.min(pageCount, Math.max(1, Number.isNaN(requestedPage) ? 1 : requestedPage));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const details = await getRowDetails(admin, pageRows);

  const filterCounts: Record<CampaignFilter, number> = {
    all: overview.total,
    active: overview.active,
    expiring: overview.expiringSoon,
    expired: overview.expired,
    draft: overview.drafts,
    paid: overview.paid,
    free: overview.free,
    refunded: overview.refunded,
  };

  function href(params: { granularity?: ReportGranularity; filter?: CampaignFilter; page?: number }) {
    const query = new URLSearchParams();
    query.set("granularity", params.granularity ?? granularity);
    query.set("filter", params.filter ?? filter);
    if (params.page && params.page > 1) query.set("page", String(params.page));
    return `/admin/reports?${query.toString()}`;
  }

  const maxRevenue = Math.max(0, ...rows.map((row) => row.revenue));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard e relatório de vendas</h1>
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <section aria-labelledby="conciliacao" className="mb-8">
        <h2 id="conciliacao" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Conciliação de pagamentos (Mercado Pago, últimos 30 dias)
        </h2>
        {audit.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {audit.error}
          </p>
        ) : problems.length === 0 ? (
          <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Tudo certo: {audit.rows.length} pagamento(s) aprovado(s) e todos com página no ar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-red-200 bg-white">
            <p className="border-b border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {problems.length} pagamento(s) aprovado(s) sem página no ar — atender agora.
            </p>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Valor</th>
                  <th className="p-2">Pagador</th>
                  <th className="p-2">Situação</th>
                  <th className="p-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((r) => (
                  <tr key={r.paymentId} className="border-t border-gray-100">
                    <td className="p-2">{r.createdAt ? formatDate(r.createdAt) : "—"}</td>
                    <td className="p-2">{formatBRLFromReais(r.amount)}</td>
                    <td className="p-2">{r.payerEmail ?? "—"}</td>
                    <td className="p-2">{AUDIT_LABEL[r.status as Exclude<AuditStatus, "ok">]}</td>
                    <td className="p-2">
                      {r.status === "release" ? (
                        <form action={releasePaymentAction}>
                          <input type="hidden" name="paymentId" value={r.paymentId} />
                          <button type="submit" className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">
                            Liberar agora
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-gray-600">
                          Pagamento nº {r.paymentId}: reembolsar ou refazer a página manualmente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="visao-geral" className="mb-8">
        <h2 id="visao-geral" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Visão geral das páginas
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Páginas criadas" value={overview.total} hint="Inclui rascunhos" />
          <StatCard
            label="No ar agora"
            value={overview.active}
            valueClassName="text-green-700"
            hint={
              overview.expiringSoon > 0
                ? `${overview.expiringSoon} encerrando em ${EXPIRING_SOON_HOURS}h`
                : undefined
            }
          />
          <StatCard label="Vencidas" value={overview.expired} />
          <StatCard
            label="Rascunhos (sem pagar)"
            value={overview.drafts}
            valueClassName={overview.drafts > 0 ? "text-amber-700" : "text-gray-900"}
          />
          <StatCard label="Pagas" value={overview.paid} valueClassName="text-emerald-700" />
          <StatCard label="Grátis" value={overview.free} valueClassName="text-violet-700" />
          <StatCard
            label="Conversão"
            value={formatPercent(overview.conversionRate)}
            hint="Páginas criadas que foram publicadas"
          />
          <StatCard
            label="Visitas / cliques"
            value={`${totals.views} / ${totals.clicks}`}
            hint={
              totals.views > 0
                ? `${formatPercent(totals.clicks / totals.views)} clicam no botão`
                : undefined
            }
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <DistributionBar
            title="Situação das páginas"
            segments={[
              { label: "Ativas", value: overview.active, barClassName: "bg-green-500" },
              { label: "Vencidas", value: overview.expired, barClassName: "bg-gray-400" },
              { label: "Rascunhos", value: overview.drafts, barClassName: "bg-yellow-400" },
              { label: "Publicando", value: overview.publishing, barClassName: "bg-blue-400" },
            ]}
          />
          <DistributionBar
            title="Páginas publicadas: pagas ou grátis"
            segments={[
              { label: "Pagas", value: overview.paid, barClassName: "bg-emerald-500" },
              { label: "Grátis", value: overview.free, barClassName: "bg-violet-400" },
              { label: "Reembolsadas", value: overview.refunded, barClassName: "bg-red-400" },
            ]}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          &quot;Grátis&quot; = publicada sem nenhum pagamento confirmado (cupom de 100% ou
          publicação pela conta admin). O sistema não registra qual dos dois foi.
        </p>
      </section>

      <section aria-labelledby="campanhas" className="mb-10">
        <h2 id="campanhas" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Campanhas
        </h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {CAMPAIGN_FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ filter: f })}
              aria-current={filter === f ? "true" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                filter === f
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {FILTER_LABEL[f]} ({filterCounts[f]})
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Nenhuma campanha nesse filtro.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Campanha</th>
                  <th className="px-4 py-2">Dono</th>
                  <th className="px-4 py-2">Situação</th>
                  <th className="px-4 py-2">Cobrança</th>
                  <th className="px-4 py-2">Criada em</th>
                  <th className="px-4 py-2">Prazo</th>
                  <th className="px-4 py-2">Visitas / cliques</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((campaign) => {
                  const detail = details[campaign.id];
                  const lifecycle = LIFECYCLE_BADGE[campaign.lifecycle];
                  const billing = BILLING_BADGE[campaign.billing];

                  return (
                    <tr key={campaign.id} className="border-b border-gray-100 align-top last:border-0">
                      <td className="max-w-[16rem] px-4 py-2">
                        <p className="truncate font-medium" title={campaign.title}>
                          {campaign.title}
                        </p>
                        {campaign.slug && campaign.lifecycle === "active" ? (
                          <Link
                            href={`/${campaign.slug}`}
                            target="_blank"
                            className="text-xs text-brand-600 hover:underline"
                          >
                            /{campaign.slug} ↗
                          </Link>
                        ) : campaign.slug ? (
                          <span className="text-xs text-gray-400">/{campaign.slug}</span>
                        ) : null}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-2 text-gray-600" title={detail?.ownerEmail ?? undefined}>
                        {detail?.ownerEmail ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <Badge {...lifecycle} />
                          {campaign.expiringSoon && (
                            <Badge label="Encerrando" className="bg-amber-100 text-amber-800" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge {...billing} />
                        {campaign.amountPaid > 0 && (
                          <p className="mt-1 text-xs text-gray-600">
                            {formatBRLFromReais(campaign.amountPaid)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">{formatDate(campaign.created_at)}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{deadlineLabel(campaign)}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {detail ? `${detail.views} / ${detail.clicks}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Página {page} de {pageCount} · {filtered.length} campanhas
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={href({ page: page - 1 })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                >
                  ← Anterior
                </Link>
              )}
              {page < pageCount && (
                <Link
                  href={href({ page: page + 1 })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="vendas">
        <h2 id="vendas" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Vendas
        </h2>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Receita bruta" value={formatBRLFromReais(summary.totalRevenue)} />
          <StatCard
            label="Reembolsado"
            value={formatBRLFromReais(summary.totalRefunded)}
            valueClassName="text-red-700"
          />
          <StatCard
            label="Receita líquida"
            value={formatBRLFromReais(summary.netRevenue)}
            valueClassName="text-green-700"
          />
          <StatCard
            label="Ticket médio"
            value={
              overview.revenue.averageTicket === null
                ? "—"
                : formatBRLFromReais(overview.revenue.averageTicket)
            }
          />
          <StatCard
            label="Pagamentos / reembolsos"
            value={`${summary.totalPayments} / ${summary.totalRefunds}`}
          />
        </div>

        <p className="mb-4 text-xs text-gray-500">
          Reembolso aqui é só um espelho do que já aconteceu no Stripe/Mercado
          Pago — pra devolver o dinheiro de verdade, faça direto no painel de
          cada um. Assim que o webhook deles confirmar o reembolso, ele aparece
          aqui automaticamente. Os períodos seguem o horário de Brasília.
        </p>

        <div className="mb-4 flex gap-2">
          {GRANULARITIES.map((g) => (
            <Link
              key={g.value}
              href={href({ granularity: g.value })}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                granularity === g.value
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="text-gray-600">Nenhum pagamento confirmado ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Período</th>
                  <th className="px-4 py-2">Pagamentos</th>
                  <th className="px-4 py-2">Receita</th>
                  <th className="px-4 py-2">Reembolsos</th>
                  <th className="px-4 py-2">Valor reembolsado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.period} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-medium capitalize">
                      {formatPeriodLabel(row.period, granularity)}
                    </td>
                    <td className="px-4 py-2">{row.paymentCount}</td>
                    <td className="px-4 py-2">
                      <div>{formatBRLFromReais(row.revenue)}</div>
                      <div
                        aria-hidden="true"
                        className="mt-1 h-1.5 rounded-full bg-emerald-400"
                        style={{ width: `${maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0}%` }}
                      />
                    </td>
                    <td className="px-4 py-2">{row.refundCount}</td>
                    <td className="px-4 py-2 text-red-700">
                      {row.refunded > 0 ? formatBRLFromReais(row.refunded) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
