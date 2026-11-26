import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getAdminDashboard } from "@/lib/admin-dashboard";
import { auditMercadoPagoPayments } from "@/lib/payment-audit";
import { countReportedComments } from "@/lib/comments";
import { getAdminFundraisers } from "@/lib/admin-fundraisers";
import KpiCard from "@/components/admin/KpiCard";
import { BadgeDollarSign, CalendarClock, Clock, FileText, Percent, Radio, Wallet } from "lucide-react";
import ActivityChart from "@/components/ActivityChart";
import { getHealthChecks, getOverviewExtras, type OverviewExtras } from "@/lib/admin-overview";

const TIME_ZONE = "America/Sao_Paulo";

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: TIME_ZONE, dateStyle: "short", timeStyle: "short" });

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-green-100 text-green-800" },
  pending: { label: "Aguardando", className: "bg-amber-100 text-amber-800" },
  failed: { label: "Falhou", className: "bg-red-100 text-red-800" },
  refunded: { label: "Reembolsado", className: "bg-gray-200 text-gray-700" },
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const [dashboard, extrasRaw, audit] = await Promise.all([
    getAdminDashboard(admin),
    getOverviewExtras(admin).catch((err) => {
      console.error("[admin] falha ao carregar os números da visão geral", err);
      return null;
    }),
    auditMercadoPagoPayments(admin, 7),
  ]);
  const extrasFailed = extrasRaw === null;
  const extras: OverviewExtras = extrasRaw ?? {
    unreadInbox: 0,
    revenueDaily: [],
    revenue7d: 0,
    revenue30d: 0,
    paymentsPending: 0,
    recentPayments: [],
    awaiting: [],
  };
  const { overview } = dashboard;
  const reportedComments = await countReportedComments(admin).catch(() => 0);
  const fundraisers = await getAdminFundraisers(admin).catch(() => null);
  // Ping real no banco: as variáveis podem existir e o banco estar fora.
  const dbStart = Date.now();
  let dbPing: { ok: boolean; ms: number };
  try {
    const r = await admin.from("campaigns").select("id", { head: true, count: "exact" }).limit(1);
    dbPing = { ok: !r.error, ms: Date.now() - dbStart };
  } catch {
    dbPing = { ok: false, ms: Date.now() - dbStart };
  }
  const health = getHealthChecks();
  const criticalDown = health.filter((h) => h.critical && !h.ok);
  const otherDown = health.filter((h) => !h.critical && !h.ok);
  const unpaid = audit.rows.filter((r) => r.status !== "ok");

  const attention: { key: string; tone: "red" | "amber"; text: string; href: string; cta: string }[] = [];
  if (unpaid.length > 0) {
    attention.push({
      key: "paid-no-page",
      tone: "red",
      text: `${unpaid.length} pagamento(s) aprovado(s) no Mercado Pago sem página no ar`,
      href: "/admin/reports",
      cta: "Atender agora",
    });
  }
  if (extrasFailed) {
    attention.push({
      key: "extras-error",
      tone: "amber",
      text: "Não foi possível carregar receita, pagamentos recentes e caixa de entrada agora. Recarregue a página.",
      href: "/admin",
      cta: "Recarregar",
    });
  }
  if (audit.error) {
    attention.push({
      key: "audit-error",
      tone: "amber",
      text: `Não foi possível conferir o Mercado Pago: ${audit.error}`,
      href: "/admin/reports",
      cta: "Ver detalhes",
    });
  }
  if (!dbPing.ok) {
    attention.push({
      key: "db",
      tone: "red",
      text: "O banco de dados não respondeu agora",
      href: "#saude",
      cta: "Ver saúde do sistema",
    });
  }
  if (criticalDown.length > 0) {
    attention.push({
      key: "health",
      tone: "red",
      text: `Configuração obrigatória faltando: ${criticalDown.map((h) => h.label).join(", ")}`,
      href: "#saude",
      cta: "Ver saúde do sistema",
    });
  }
  if (reportedComments > 0) {
    attention.push({
      key: "comments",
      tone: "amber",
      text: `${reportedComments} comentário(s) denunciado(s) esperando análise`,
      href: "/admin/comments",
      cta: "Analisar",
    });
  }
  if (extras.unreadInbox > 0) {
    attention.push({
      key: "inbox",
      tone: "amber",
      text: `${extras.unreadInbox} e-mail(s) não lido(s) na caixa de entrada`,
      href: "/admin/inbox",
      cta: "Abrir caixa de entrada",
    });
  }
  if (fundraisers && fundraisers.stalePending > 0) {
    attention.push({
      key: "donations-stale",
      tone: "amber",
      text: `${fundraisers.stalePending} doação(ões) iniciada(s) há mais de 1 hora sem confirmação`,
      href: "/admin/arrecadacoes",
      cta: "Ver arrecadações",
    });
  }
  if (extras.awaiting.length > 0) {
    attention.push({
      key: "awaiting",
      tone: "amber",
      text: `${extras.awaiting.length} campanha(s) foram ao pagamento nas últimas 24h e ainda não estão no ar`,
      href: "#aguardando",
      cta: "Ver quem são",
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 display text-4xl sm:text-5xl">Visão geral</h1>
      <p className="mb-6 text-sm text-gray-600">O que precisa de atenção e como o negócio está hoje.</p>

      <section aria-labelledby="atencao" className="mb-8">
        <h2 id="atencao" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Precisa de atenção
        </h2>
        {attention.length === 0 ? (
          <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Tudo em ordem: nenhum pagamento sem página, nada a ler e o sistema configurado.
          </p>
        ) : (
          <ul className="space-y-2">
            {attention.map((a) => (
              <li
                key={a.key}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${
                  a.tone === "red"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <span>{a.text}</span>
                <Link href={a.href} className="font-medium underline">
                  {a.cta} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="numeros" className="mb-8">
        <h2 id="numeros" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Números
        </h2>
        <div className="mb-3 rounded-md border-2 border-ink bg-white p-4">
          <p className="mb-2 text-xs font-extrabold uppercase text-ink-soft">Receita por dia — últimos 30 dias</p>
          <ActivityChart
            data={extras.revenueDaily.map((d) => ({ date: d.date, revenue: d.revenue, payments: d.payments }))}
            series={[{ key: "revenue", label: "Receita", color: "#0e5a39" }]}
            valueFormat="brl"
            summary={`Receita confirmada por dia nos últimos 30 dias: ${brl(extras.revenue30d)} no total.`}
            height={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Receita (7 dias)" icon={BadgeDollarSign} tone="folha" value={brl(extras.revenue7d)} />
          <KpiCard label="Receita (30 dias)" icon={Wallet} tone="folha" value={brl(extras.revenue30d)} />
          <KpiCard label="Páginas no ar" icon={Radio} tone="brand" value={overview.active} hint={`${overview.expiringSoon} encerrando em 48h`} />
          <KpiCard label="Pagamentos aguardando" icon={Clock} tone="sol" value={extras.paymentsPending} hint="Pix/boleto ainda não compensados" />
          <KpiCard label="Páginas criadas" icon={FileText} value={overview.total} hint={`${overview.drafts} rascunhos`} />
          <KpiCard label="Vencidas" icon={CalendarClock} value={overview.expired} />
          <KpiCard
            label="Conversão" icon={Percent} tip="Parte das páginas criadas que chegou a ser paga."
            value={overview.conversionRate === null ? "—" : `${Math.round(overview.conversionRate * 100)}%`}
            hint="Criadas que foram publicadas"
          />
          <KpiCard label="Receita total líquida" value={brl(overview.revenue.net)} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Mais detalhes (por campanha, período e conciliação) em{" "}
          <Link href="/admin/reports" className="text-brand-600 underline">
            Campanhas e vendas
          </Link>
          .
        </p>
      </section>

      <section id="aguardando" aria-labelledby="aguardando-titulo" className="mb-8">
        <h2 id="aguardando-titulo" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Foram ao pagamento e ainda não estão no ar (24h)
        </h2>
        {extras.awaiting.length === 0 ? (
          <p className="text-sm text-gray-500">Ninguém aguardando.</p>
        ) : (
          <div tabIndex={0} role="region" aria-label="Campanhas aguardando página (rolar para o lado)" className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th scope="col" className="p-2">Campanha</th>
                  <th scope="col" className="p-2">Conta</th>
                  <th scope="col" className="p-2">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {extras.awaiting.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="p-2">{a.title}</td>
                    <td className="p-2">{a.ownerEmail ?? "—"}</td>
                    <td className="p-2">{when(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Pode ser Pix ainda por pagar. Se a pessoa disser que pagou, confira em &quot;Campanhas e vendas&quot;.
        </p>
      </section>

      <section aria-labelledby="pagamentos" className="mb-8">
        <h2 id="pagamentos" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Últimos pagamentos registrados
        </h2>
        {extras.recentPayments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum pagamento registrado ainda.</p>
        ) : (
          <div tabIndex={0} role="region" aria-label="Últimos pagamentos (rolar para o lado)" className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th scope="col" className="p-2">Data</th>
                  <th scope="col" className="p-2">Campanha</th>
                  <th scope="col" className="p-2">Valor</th>
                  <th scope="col" className="p-2">Meio</th>
                  <th scope="col" className="p-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {extras.recentPayments.map((p) => {
                  const status = STATUS_LABEL[p.status] ?? { label: p.status, className: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="p-2">{when(p.created_at)}</td>
                      <td className="p-2">{p.campaignTitle ?? "(campanha apagada)"}</td>
                      <td className="p-2">{brl(p.amount)}</td>
                      <td className="p-2">{p.provider === "mercadopago" ? "Mercado Pago" : "Stripe"}</td>
                      <td className="p-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="saude" aria-labelledby="saude-titulo">
        <h2 id="saude-titulo" className="mb-3 text-sm font-semibold uppercase text-gray-500">
          Saúde do sistema
        </h2>
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-white text-sm">
          <li className="flex items-start justify-between gap-4 p-3">
            <div>
              <p className="font-medium text-gray-900">Banco de dados respondendo</p>
              {!dbPing.ok && <p className="text-xs text-gray-600">O site não consegue ler o banco agora.</p>}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                dbPing.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {dbPing.ok ? `OK · ${dbPing.ms} ms` : "Fora do ar"}
            </span>
          </li>
          {health.map((h) => (
            <li key={h.key} className="flex items-start justify-between gap-4 p-3">
              <div>
                <p className="font-medium text-gray-900">{h.label}</p>
                {!h.ok && <p className="text-xs text-gray-600">{h.impact}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  h.ok
                    ? "bg-green-100 text-green-800"
                    : h.critical
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {h.ok ? "Configurado" : "Faltando"}
              </span>
            </li>
          ))}
        </ul>
        {otherDown.length === 0 && criticalDown.length === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Isto só confere se as variáveis existem na Vercel; não testa se os valores estão certos.
          </p>
        )}
      </section>
    </div>
  );
}
