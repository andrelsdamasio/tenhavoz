import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export type ReportGranularity = "day" | "month" | "year";

export interface ReportRow {
  period: string;
  revenue: number;
  paymentCount: number;
  refunded: number;
  refundCount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  totalPayments: number;
  totalRefunds: number;
}

function periodKey(iso: string, granularity: ReportGranularity): string {
  const d = new Date(iso);
  if (granularity === "year") return String(d.getFullYear());
  if (granularity === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return d.toISOString().slice(0, 10);
}

/**
 * Agrupa payments confirmados/reembolsados por período em memória (não em
 * SQL) — o volume esperado (uma campanha SaaS de nicho, não milhões de
 * linhas) não justifica uma função de agregação no banco.
 */
export async function getSalesReport(
  admin: SupabaseClient<Database>,
  granularity: ReportGranularity
): Promise<{ rows: ReportRow[]; summary: ReportSummary }> {
  const { data, error } = await admin
    .from("payments")
    .select("amount, status, created_at")
    .in("status", ["confirmed", "refunded"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byPeriod = new Map<string, ReportRow>();

  for (const payment of data ?? []) {
    const key = periodKey(payment.created_at, granularity);
    const row =
      byPeriod.get(key) ?? { period: key, revenue: 0, paymentCount: 0, refunded: 0, refundCount: 0 };

    if (payment.status === "confirmed") {
      row.revenue += Number(payment.amount);
      row.paymentCount += 1;
    } else {
      row.refunded += Number(payment.amount);
      row.refundCount += 1;
    }

    byPeriod.set(key, row);
  }

  const rows = Array.from(byPeriod.values()).sort((a, b) => (a.period < b.period ? 1 : -1));

  const summary = rows.reduce<ReportSummary>(
    (acc, row) => ({
      totalRevenue: acc.totalRevenue + row.revenue,
      totalRefunded: acc.totalRefunded + row.refunded,
      netRevenue: acc.netRevenue + row.revenue - row.refunded,
      totalPayments: acc.totalPayments + row.paymentCount,
      totalRefunds: acc.totalRefunds + row.refundCount,
    }),
    { totalRevenue: 0, totalRefunded: 0, netRevenue: 0, totalPayments: 0, totalRefunds: 0 }
  );

  return { rows, summary };
}
