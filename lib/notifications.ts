import type { SupabaseClient } from "@supabase/supabase-js";
import type { Campaign, Database } from "@/lib/types";
import { sendEmail } from "@/lib/email";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tenhavoz.com.br").replace(/\/$/, "");
}

/** E-mails de ADMIN_EMAILS (quem recebe os alertas). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Avisa a pessoa que o pagamento foi confirmado e a página está no ar —
 * é o que evita ela achar que "não liberou" e apagar a campanha. Melhor
 * esforço: qualquer falha só vai pro log.
 */
export async function notifyCustomerPaymentConfirmed(
  admin: SupabaseClient<Database>,
  campaign: Pick<Campaign, "user_id" | "title" | "slug">
): Promise<void> {
  try {
    const { data } = await admin.auth.admin.getUserById(campaign.user_id);
    const email = data.user?.email;
    if (!email || !campaign.slug) return;

    await sendEmail({
      to: email,
      subject: "Pagamento confirmado — sua página está no ar",
      text:
        `Seu pagamento foi confirmado e a campanha "${campaign.title}" já está no ar:\n\n` +
        `${siteUrl()}/${campaign.slug}\n\n` +
        `Você também pode gerenciá-la em ${siteUrl()}/dashboard.\n\n` +
        `Equipe TenhaVoz`,
    });
  } catch (err) {
    console.error("[notifications] falha ao avisar o cliente", err);
  }
}
