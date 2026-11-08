import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendEmail } from "@/lib/email";

/** Avisamos quando faltam menos que isto para a campanha encerrar. */
export const EXPIRY_WARNING_MS = 24 * 60 * 60 * 1000;

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tenhavoz.com.br").replace(/\/$/, "");
}

/**
 * Avisa por e-mail o dono de cada campanha que encerra nas próximas 24h, uma
 * vez só (expiry_notified_at), com o caminho para renovar. Se o e-mail falhar,
 * não marca como avisado e a próxima rodada tenta de novo.
 */
export async function notifyExpiringCampaigns(
  admin: SupabaseClient<Database>,
  now = Date.now()
): Promise<{ notified: number }> {
  const { data, error } = await admin
    .from("campaigns")
    .select("id, user_id, title, slug, expires_at")
    .eq("status", "published")
    .is("expiry_notified_at", null)
    .gt("expires_at", new Date(now).toISOString())
    .lt("expires_at", new Date(now + EXPIRY_WARNING_MS).toISOString());
  if (error) throw error;

  let notified = 0;
  for (const campaign of data ?? []) {
    try {
      const { data: owner } = await admin.auth.admin.getUserById(campaign.user_id);
      const email = owner.user?.email;
      if (!email) continue;

      const hours = Math.max(1, Math.ceil((new Date(campaign.expires_at!).getTime() - now) / 3600000));
      const sent = await sendEmail({
        to: email,
        subject: `Sua campanha "${campaign.title}" encerra em ${hours}h`,
        text:
          `A campanha "${campaign.title}" sai do ar em cerca de ${hours} hora(s).\\n\\n` +
          `Para manter o link funcionando para quem ainda vai participar, renove em ${siteBase()}/dashboard ` +
          `(botão "Renovar campanha" aparece quando ela encerra, e você pode duplicá-la antes disso).\\n\\n` +
          `Equipe TenhaVoz`,
      });
      if (!sent) continue;

      await admin
        .from("campaigns")
        .update({ expiry_notified_at: new Date().toISOString() })
        .eq("id", campaign.id);
      notified += 1;
    } catch (err) {
      console.error("[expiry-notice] falha ao avisar", { campaignId: campaign.id, err });
    }
  }
  return { notified };
}
