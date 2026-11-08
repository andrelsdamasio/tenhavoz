import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Fundraiser, FundraiserBudgetItem } from "@/lib/types";

export interface PublicDonation {
  id: string;
  name: string;
  amount_cents: number;
  message: string | null;
  created_at: string;
}

export interface FundraiserView {
  fundraiser: Fundraiser;
  budget: FundraiserBudgetItem[];
  donations: PublicDonation[];
  raisedCents: number;
  donationCount: number;
}

/** Porcentagem da meta (0–100, arredondada para baixo; nunca passa de 100 na barra). */
export function progressPercent(raisedCents: number, goalCents: number): number {
  if (goalCents <= 0) return 0;
  return Math.min(100, Math.floor((raisedCents / goalCents) * 100));
}

export function daysLeft(endsAt: string | null, now: Date = new Date()): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** Nome mostrado na lista pública: "Anônimo" quando a pessoa pediu, senão o primeiro nome. */
export function publicDonorName(d: { donor_name: string | null; is_anonymous: boolean }): string {
  if (d.is_anonymous) return "Anônimo";
  const first = (d.donor_name ?? "").trim().split(/\s+/)[0];
  return first || "Anônimo";
}

export async function loadFundraiserView(
  admin: SupabaseClient<Database>,
  slug: string
): Promise<FundraiserView | null> {
  const { data } = await admin.from("fundraisers").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const fundraiser = data as Fundraiser;

  const [budgetRes, donationsRes] = await Promise.all([
    admin.from("fundraiser_budget_items").select("*").eq("fundraiser_id", fundraiser.id).order("position", { ascending: true }),
    admin
      .from("fundraiser_donations")
      .select("id, donor_name, is_anonymous, amount_cents, message, created_at")
      .eq("fundraiser_id", fundraiser.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const rows = (donationsRes.data ?? []) as {
    id: string;
    donor_name: string | null;
    is_anonymous: boolean;
    amount_cents: number;
    message: string | null;
    created_at: string;
  }[];

  return {
    fundraiser,
    budget: (budgetRes.data ?? []) as FundraiserBudgetItem[],
    donations: rows.slice(0, 20).map((r) => ({
      id: r.id,
      name: publicDonorName(r),
      amount_cents: r.amount_cents,
      message: r.message,
      created_at: r.created_at,
    })),
    raisedCents: rows.reduce((sum, r) => sum + r.amount_cents, 0),
    donationCount: rows.length,
  };
}

export interface ActiveFundraiserCard {
  slug: string;
  title: string;
  summary: string | null;
  beneficiaryName: string | null;
  coverImageUrl: string | null;
  goalCents: number;
  raisedCents: number;
  daysLeft: number | null;
}

/** Campanhas de doação no ar (ativas e dentro do prazo), com o valor arrecadado, para a home. */
export async function listActiveFundraisers(
  admin: SupabaseClient<Database>,
  limit = 6
): Promise<ActiveFundraiserCard[]> {
  try {
    const { data } = await admin
      .from("fundraisers")
      .select("id, slug, title, summary, beneficiary_name, cover_image_url, goal_cents, ends_at")
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(limit * 2);
    const rows = (data ?? []) as {
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      beneficiary_name: string | null;
      cover_image_url: string | null;
      goal_cents: number;
      ends_at: string | null;
    }[];
    const open = rows.filter((r) => daysLeft(r.ends_at) !== 0).slice(0, limit);
    if (open.length === 0) return [];

    const { data: dons } = await admin
      .from("fundraiser_donations")
      .select("fundraiser_id, amount_cents")
      .in("fundraiser_id", open.map((r) => r.id))
      .eq("status", "approved");
    const totals = new Map<string, number>();
    for (const d of (dons ?? []) as { fundraiser_id: string; amount_cents: number }[]) {
      totals.set(d.fundraiser_id, (totals.get(d.fundraiser_id) ?? 0) + d.amount_cents);
    }
    return open.map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      beneficiaryName: r.beneficiary_name,
      coverImageUrl: r.cover_image_url,
      goalCents: r.goal_cents,
      raisedCents: totals.get(r.id) ?? 0,
      daysLeft: daysLeft(r.ends_at),
    }));
  } catch {
    return [];
  }
}
