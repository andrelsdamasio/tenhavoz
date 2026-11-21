import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const HOUR = 60 * 60 * 1000;

export interface AdminFundraiserRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  goalCents: number;
  raisedCents: number;
  feeCents: number;
  donations: number;
  endsAt: string | null;
  createdAt: string;
  ownerEmail: string | null;
  connected: boolean;
}

export interface AdminFundraiserSummary {
  active: number;
  suspended: number;
  raisedCents: number;
  feeCents: number;
  tipCents: number;
  approvedDonations: number;
  /** Doações iniciadas há mais de 1 hora e ainda sem confirmação: o aviso do Mercado Pago pode ter se perdido. */
  stalePending: number;
  rows: AdminFundraiserRow[];
}

/** Resumo para o admin: totais, taxas do TenhaVoz e a lista de campanhas de arrecadação. */
export async function getAdminFundraisers(
  admin: SupabaseClient<Database>,
  now = Date.now()
): Promise<AdminFundraiserSummary> {
  const [fundraisers, donations, connections] = await Promise.all([
    admin
      .from("fundraisers")
      .select("id, slug, title, status, goal_cents, ends_at, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("fundraiser_donations")
      .select("fundraiser_id, status, amount_cents, platform_fee_cents, tip_cents, created_at")
      .limit(10000),
    admin.from("seller_connections").select("user_id"),
  ]);

  const connected = new Set((connections.data ?? []).map((c) => c.user_id));
  const byFundraiser = new Map<string, { raised: number; fee: number; count: number }>();
  let raisedCents = 0;
  let feeCents = 0;
  let tipCents = 0;
  let approvedDonations = 0;
  let stalePending = 0;

  for (const d of donations.data ?? []) {
    if (d.status === "approved") {
      const entry = byFundraiser.get(d.fundraiser_id) ?? { raised: 0, fee: 0, count: 0 };
      entry.raised += Number(d.amount_cents);
      entry.fee += Number(d.platform_fee_cents);
      entry.count += 1;
      byFundraiser.set(d.fundraiser_id, entry);
      raisedCents += Number(d.amount_cents);
      feeCents += Number(d.platform_fee_cents);
      tipCents += Number(d.tip_cents);
      approvedDonations += 1;
    } else if (d.status === "pending" && now - new Date(d.created_at).getTime() > HOUR) {
      stalePending += 1;
    }
  }

  const rows: AdminFundraiserRow[] = [];
  for (const f of fundraisers.data ?? []) {
    const totals = byFundraiser.get(f.id);
    const owner = await admin.auth.admin.getUserById(f.user_id).catch(() => null);
    rows.push({
      id: f.id,
      slug: f.slug,
      title: f.title,
      status: f.status,
      goalCents: Number(f.goal_cents),
      raisedCents: totals?.raised ?? 0,
      feeCents: totals?.fee ?? 0,
      donations: totals?.count ?? 0,
      endsAt: f.ends_at,
      createdAt: f.created_at,
      ownerEmail: owner?.data?.user?.email ?? null,
      connected: connected.has(f.user_id),
    });
  }

  return {
    active: rows.filter((r) => r.status === "active").length,
    suspended: rows.filter((r) => r.status === "suspended").length,
    raisedCents,
    feeCents,
    tipCents,
    approvedDonations,
    stalePending,
    rows,
  };
}
