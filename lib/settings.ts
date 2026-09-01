import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings, Database, TemplateId } from "@/lib/types";

const FALLBACK_SETTINGS: Omit<AppSettings, "id" | "updated_at"> = {
  campaign_price_brl_cents: Number(process.env.CAMPAIGN_PRICE_BRL_CENTS ?? "4900"),
  enabled_templates: [1, 2, 3],
};

/**
 * Lê as configurações do painel /admin (preço, templates habilitados).
 * Se a linha singleton ainda não existir (banco recém-criado antes da
 * migration 0002 rodar), cai para o valor padrão em vez de quebrar a página.
 */
export async function getAppSettings(
  supabase: SupabaseClient<Database>
): Promise<Omit<AppSettings, "id" | "updated_at">> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("campaign_price_brl_cents, enabled_templates")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return FALLBACK_SETTINGS;
  }

  return {
    campaign_price_brl_cents: data.campaign_price_brl_cents,
    enabled_templates: data.enabled_templates as TemplateId[],
  };
}

export interface UpdateAppSettingsInput {
  campaignPriceBrlCents: number;
  enabledTemplates: TemplateId[];
}

export async function updateAppSettings(
  admin: SupabaseClient<Database>,
  input: UpdateAppSettingsInput
): Promise<void> {
  const { error } = await admin
    .from("app_settings")
    .update({
      campaign_price_brl_cents: input.campaignPriceBrlCents,
      enabled_templates: input.enabledTemplates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) throw error;
}
