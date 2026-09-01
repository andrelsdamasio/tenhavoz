import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EventType } from "@/lib/types";

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
 * Conta views/clicks por campanha. Usa o client admin porque a tabela
 * events não tem policy de select para authenticated (só a service role
 * escreve e lê) — quem chama isto já precisa ter validado que os
 * campaignIds pertencem ao usuário logado (ver app/dashboard/page.tsx).
 */
export async function getCampaignStats(
  admin: SupabaseClient<Database>,
  campaignIds: string[]
): Promise<Record<string, CampaignStats>> {
  if (campaignIds.length === 0) return {};

  const { data, error } = await admin
    .from("events")
    .select("campaign_id, type")
    .in("campaign_id", campaignIds);

  if (error) throw error;

  const stats: Record<string, CampaignStats> = {};
  for (const id of campaignIds) {
    stats[id] = { views: 0, clicks: 0 };
  }

  for (const row of data ?? []) {
    const bucket = stats[row.campaign_id];
    if (!bucket) continue;
    if (row.type === "view") bucket.views += 1;
    if (row.type === "click") bucket.clicks += 1;
  }

  return stats;
}
