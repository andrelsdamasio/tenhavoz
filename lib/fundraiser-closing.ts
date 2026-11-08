import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendEmail } from "@/lib/email";
import { closingCreatorEmail, closingDonorEmail } from "@/lib/donation-emails";
import { SITE_URL } from "@/lib/mp-oauth";

const MAX_DONOR_EMAILS_PER_RUN = 500;

/**
 * Encerra campanhas vencidas e avisa doadores e criador (uma única vez por campanha).
 * `onlyId` limita o trabalho a uma campanha (usado quando o criador encerra na mão).
 */
export async function closeAndNotifyFundraisers(admin: SupabaseClient<Database>, onlyId?: string): Promise<{ closed: number; emails: number }> {
  if (!onlyId) {
    await admin.from("fundraisers").update({ status: "ended" }).eq("status", "active").not("ends_at", "is", null).lte("ends_at", new Date().toISOString());
  }

  let query = admin.from("fundraisers").select("id, user_id, title, slug, goal_cents").eq("status", "ended").is("closing_emailed_at", null).limit(20);
  if (onlyId) query = query.eq("id", onlyId);
  const { data: pending } = await query;

  let closed = 0;
  let emails = 0;
  for (const f of (pending ?? []) as { id: string; user_id: string; title: string; slug: string; goal_cents: number }[]) {
    // "reserva" a campanha: só quem conseguir marcar envia (evita e-mail em dobro)
    const { data: claimed } = await admin
      .from("fundraisers")
      .update({ closing_emailed_at: new Date().toISOString() })
      .eq("id", f.id)
      .is("closing_emailed_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;
    closed++;

    const { data: dons } = await admin
      .from("fundraiser_donations")
      .select("amount_cents, donor_email")
      .eq("fundraiser_id", f.id)
      .eq("status", "approved");
    const rows = (dons ?? []) as { amount_cents: number; donor_email: string | null }[];
    const raisedCents = rows.reduce((t, r) => t + r.amount_cents, 0);
    const base = { title: f.title, slug: f.slug, siteUrl: SITE_URL, raisedCents, donationCount: rows.length };

    const recipients = Array.from(new Set(rows.map((r) => r.donor_email).filter((e): e is string => !!e))).slice(0, MAX_DONOR_EMAILS_PER_RUN);
    const donorMail = closingDonorEmail(base);
    for (const to of recipients) {
      if (await sendEmail({ to, ...donorMail })) emails++;
    }

    try {
      const { data: userRes } = await admin.auth.admin.getUserById(f.user_id);
      const creatorEmail = userRes?.user?.email;
      if (creatorEmail) {
        if (await sendEmail({ to: creatorEmail, ...closingCreatorEmail({ ...base, goalCents: f.goal_cents }) })) emails++;
      }
    } catch (err) {
      console.error("[encerramento] falha ao avisar o criador", err);
    }
  }
  return { closed, emails };
}
