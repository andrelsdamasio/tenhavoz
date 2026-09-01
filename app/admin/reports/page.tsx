import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { getSalesReport, type ReportGranularity } from "@/lib/reports";

function formatBRLFromReais(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ granularity?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { granularity: granularityRaw } = await searchParams;
  const granularity: ReportGranularity =
    granularityRaw === "day" || granularityRaw === "year" ? granularityRaw : "month";

  const { rows, summary } = await getSalesReport(createAdminClient(), granularity);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Relatório de vendas</h1>
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Receita bruta</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatBRLFromReais(summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Reembolsado</p>
          <p className="text-lg font-semibold text-red-700">
            {formatBRLFromReais(summary.totalRefunded)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Receita líquida</p>
          <p className="text-lg font-semibold text-green-700">
            {formatBRLFromReais(summary.netRevenue)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Pagamentos / reembolsos</p>
          <p className="text-lg font-semibold text-gray-900">
            {summary.totalPayments} / {summary.totalRefunds}
          </p>
        </div>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        Reembolso aqui é só um espelho do que já aconteceu no Stripe/Mercado
        Pago — pra devolver o dinheiro de verdade, faça direto no painel de
        cada um. Assim que o webhook deles confirmar o reembolso, ele aparece
        aqui automaticamente.
      </p>

      <div className="mb-4 flex gap-2">
        {GRANULARITIES.map((g) => (
          <Link
            key={g.value}
            href={`/admin/reports?granularity=${g.value}`}
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
                  <td className="px-4 py-2">{formatBRLFromReais(row.revenue)}</td>
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
    </div>
  );
}
