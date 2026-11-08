import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EventType } from "@/lib/types";
import { fillDays, type DayStat } from "@/lib/campaign-stats";

export async function recordEvent(
  admin: SupabaseClient<Database>,
  campaignId: string,
  type: EventType
): Promise<void> {
  const { error } = await admin.from("events").insert({ campaign_id: campaignId, type });
  if (error) throw error;
}

export interface CampaignStats {
  views: number;
  clicks: number;
}

/**
 * Conta views/clicks por campanha, agregando no banco (função campaign_totals).
 * Usa o client admin porque a tabela events não tem policy de select para
 * authenticated — quem chama já precisa ter validado que os campaignIds
 * pertencem ao usuário logado (ver app/dashboard/page.tsx).
 */
export async function getCampaignStats(
  admin: SupabaseClient<Database>,
  campaignIds: string[]
): Promise<Record<string, CampaignStats>> {
  if (campaignIds.length === 0) return {};

  const { data, error } = await admin.rpc("campaign_totals", { p_ids: campaignIds });
  if (error) throw error;

  const stats: Record<string, CampaignStats> = {};
  for (const id of campaignIds) stats[id] = { views: 0, clicks: 0 };
  for (const row of data ?? []) {
    stats[row.campaign_id] = { views: Number(row.views), clicks: Number(row.clicks) };
  }
  return stats;
}

/** Visualizações e cliques por dia (últimos `days` dias) de cada campanha. */
export async function getDailyStats(
  admin: SupabaseClient<Database>,
  campaignIds: string[],
  days = 14,
  now = Date.now()
): Promise<Record<string, DayStat[]>> {
  if (campaignIds.length === 0) return {};

  const { data, error } = await admin.rpc("campaign_daily", { p_ids: campaignIds, p_days: days });
  if (error) throw error;

  const grouped: Record<string, { day: string; views: number; clicks: number }[]> = {};
  for (const id of campaignIds) grouped[id] = [];
  for (const row of data ?? []) grouped[row.campaign_id]?.push(row);

  const result: Record<string, DayStat[]> = {};
  for (const id of campaignIds) result[id] = fillDays(grouped[id] ?? [], days, now);
  return result;
}
