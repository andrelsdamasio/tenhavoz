import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign, Database, Payment } from "@/lib/types";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/**
 * Dashboard do admin: visão de todas as campanhas (ativas, vencidas,
 * rascunhos), de quais foram pagas ou gratuitas, e da receita.
 *
 * "Grátis" não é gravado em lugar nenhum: uma campanha de cupom de 100%
 * (claimFreeCampaign) ou publicada pelo admin (publishFreeAsAdmin) é
 * publicada SEM nenhuma linha em `payments`. Por isso a classificação abaixo
 * deduz: publicada + nenhum pagamento confirmado com valor > 0 = grátis.
 */

export type Lifecycle = "draft" | "publishing" | "active" | "expired";
export type Billing = "unpaid" | "paid" | "free" | "refunded";
export type CampaignFilter =
  | "all"
  | "active"
  | "expiring"
  | "expired"
  | "draft"
  | "paid"
  | "free"
  | "refunded";

export const CAMPAIGN_FILTERS: CampaignFilter[] = [
  "all",
  "active",
  "expiring",
  "expired",
  "draft",
  "paid",
  "free",
  "refunded",
];

/** Campanhas ativas que acabam dentro deste prazo contam como "encerrando". */
export const EXPIRING_SOON_HOURS = 48;

export type CampaignLite = Pick<
  Campaign,
  "id" | "user_id" | "title" | "slug" | "status" | "created_at" | "expires_at" | "duration_hours"
>;

export type PaymentLite = Pick<Payment, "campaign_id" | "status" | "amount" | "created_at">;

export interface ClassifiedCampaign extends CampaignLite {
  lifecycle: Lifecycle;
  billing: Billing;
  /** Soma dos pagamentos confirmados, em reais. 0 para grátis/rascunho. */
  amountPaid: number;
  /** Ativa e acaba dentro de EXPIRING_SOON_HOURS. */
  expiringSoon: boolean;
  /** Milissegundos até expirar (negativo = já expirou); null = sem prazo. */
  msUntilExpiry: number | null;
}

export function classifyCampaign(
  campaign: CampaignLite,
  payments: PaymentLite[],
  now: Date
): ClassifiedCampaign {
  const expiresMs = campaign.expires_at ? new Date(campaign.expires_at).getTime() : null;
  const msUntilExpiry = expiresMs === null ? null : expiresMs - now.getTime();

  let lifecycle: Lifecycle;
  if (campaign.status === "draft") lifecycle = "draft";
  else if (campaign.status === "paid") lifecycle = "publishing";
  else lifecycle = msUntilExpiry !== null && msUntilExpiry <= 0 ? "expired" : "active";

  const confirmed = payments.filter((p) => p.status === "confirmed" && Number(p.amount) > 0);
  const refunded = payments.filter((p) => p.status === "refunded" && Number(p.amount) > 0);
  const amountPaid = confirmed.reduce((sum, p) => sum + Number(p.amount), 0);

  let billing: Billing;
  if (lifecycle === "draft") billing = "unpaid";
  else if (confirmed.length > 0) billing = "paid";
  else if (refunded.length > 0) billing = "refunded";
  else billing = "free";

  const expiringSoon =
    lifecycle === "active" &&
    msUntilExpiry !== null &&
    msUntilExpiry <= EXPIRING_SOON_HOURS * 60 * 60 * 1000;

  return { ...campaign, lifecycle, billing, amountPaid, expiringSoon, msUntilExpiry };
}

export function matchesFilter(campaign: ClassifiedCampaign, filter: CampaignFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return campaign.lifecycle === "active";
    case "expiring":
      return campaign.expiringSoon;
    case "expired":
      return campaign.lifecycle === "expired";
    case "draft":
      return campaign.lifecycle === "draft";
    case "paid":
      return campaign.billing === "paid";
    case "free":
      return campaign.billing === "free";
    case "refunded":
      return campaign.billing === "refunded";
  }
}

export function parseFilter(raw: string | undefined): CampaignFilter {
  return CAMPAIGN_FILTERS.find((f) => f === raw) ?? "all";
}

export interface DashboardOverview {
  total: number;
  drafts: number;
  publishing: number;
  active: number;
  expiringSoon: number;
  expired: number;
  /** Campanhas que já foram publicadas (ativas + vencidas + publicando). */
  published: number;
  paid: number;
  free: number;
  refunded: number;
  /** published / total — quantos rascunhos viraram página no ar. null se total = 0. */
  conversionRate: number | null;
  /** Em reais. */
  revenue: { gross: number; refunded: number; net: number; averageTicket: number | null };
}

export function buildOverview(
  campaigns: ClassifiedCampaign[],
  payments: PaymentLite[]
): DashboardOverview {
  const count = (predicate: (c: ClassifiedCampaign) => boolean) =>
    campaigns.filter(predicate).length;

  const published = count((c) => c.lifecycle !== "draft");
  const paid = count((c) => c.billing === "paid");

  const gross = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const refunded = payments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const confirmedCount = payments.filter(
    (p) => p.status === "confirmed" && Number(p.amount) > 0
  ).length;

  return {
    total: campaigns.length,
    drafts: count((c) => c.lifecycle === "draft"),
    publishing: count((c) => c.lifecycle === "publishing"),
    active: count((c) => c.lifecycle === "active"),
    expiringSoon: count((c) => c.expiringSoon),
    expired: count((c) => c.lifecycle === "expired"),
    published,
    paid,
    free: count((c) => c.billing === "free"),
    refunded: count((c) => c.billing === "refunded"),
    conversionRate: campaigns.length > 0 ? published / campaigns.length : null,
    revenue: {
      gross,
      refunded,
      net: gross - refunded,
      averageTicket: confirmedCount > 0 ? gross / confirmedCount : null,
    },
  };
}

export interface AdminDashboardData {
  campaigns: ClassifiedCampaign[];
  overview: DashboardOverview;
  totals: { views: number; clicks: number };
}

async function countEvents(
  admin: SupabaseClient<Database>,
  type: "view" | "click",
  campaignId?: string
): Promise<number> {
  let query = admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("type", type);
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Carrega todas as campanhas e pagamentos (paginado — o Supabase corta em
 * 1000 linhas por consulta) e classifica cada campanha. Os totais de
 * views/cliques usam contagem no banco (head) em vez de baixar as linhas.
 */
export async function getAdminDashboard(
  admin: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<AdminDashboardData> {
  const [campaignRows, paymentRows, views, clicks] = await Promise.all([
    fetchAllRows<CampaignLite>((from, to) =>
      admin
        .from("campaigns")
        .select("id, user_id, title, slug, status, created_at, expires_at, duration_hours")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    fetchAllRows<PaymentLite>((from, to) =>
      admin
        .from("payments")
        .select("campaign_id, status, amount, created_at")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    countEvents(admin, "view"),
    countEvents(admin, "click"),
  ]);

  const paymentsByCampaign = new Map<string, PaymentLite[]>();
  for (const payment of paymentRows) {
    const list = paymentsByCampaign.get(payment.campaign_id) ?? [];
    list.push(payment);
    paymentsByCampaign.set(payment.campaign_id, list);
  }

  const campaigns = campaignRows.map((campaign) =>
    classifyCampaign(campaign, paymentsByCampaign.get(campaign.id) ?? [], now)
  );

  return {
    campaigns,
    overview: buildOverview(campaigns, paymentRows),
    totals: { views, clicks },
  };
}

export interface CampaignRowDetails {
  ownerEmail: string | null;
  views: number;
  clicks: number;
}

/**
 * Detalhes só das campanhas exibidas na página atual da tabela (e-mail do
 * dono + views/cliques). Feito por página de propósito: contar eventos por
 * campanha pra todas seria uma consulta por campanha; e baixar as linhas de
 * `events` esbarraria no limite de 1000 do Supabase.
 */
export async function getRowDetails(
  admin: SupabaseClient<Database>,
  campaigns: Pick<CampaignLite, "id" | "user_id">[]
): Promise<Record<string, CampaignRowDetails>> {
  const entries = await Promise.all(
    campaigns.map(async (campaign): Promise<[string, CampaignRowDetails]> => {
      const [views, clicks, owner] = await Promise.all([
        countEvents(admin, "view", campaign.id),
        countEvents(admin, "click", campaign.id),
        admin.auth.admin.getUserById(campaign.user_id).catch(() => null),
      ]);

      return [
        campaign.id,
        { ownerEmail: owner?.data?.user?.email ?? null, views, clicks },
      ];
    })
  );

  return Object.fromEntries(entries);
}
