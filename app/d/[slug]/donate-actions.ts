"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { buildPreferenceBody, computeCharge, parseDonationForm } from "@/lib/donations";
import { getSellerAccessToken, SITE_URL } from "@/lib/mp-oauth";
import { daysLeft } from "@/lib/fundraiser-public";

export interface DonateState {
  error: string | null;
  checkoutUrl: string | null;
}

/** Cria a doação "pendente" e a cobrança na conta do criador; devolve o link de pagamento. */
export async function donateAction(slug: string, _prev: DonateState, formData: FormData): Promise<DonateState> {
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) return { error: "Doações indisponíveis no momento.", checkoutUrl: null };

  const parsed = parseDonationForm(formData);
  if (!parsed.ok) return { error: parsed.error, checkoutUrl: null };

  const { data: f } = await admin
    .from("fundraisers")
    .select("id, user_id, title, slug, status, ends_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!f || f.status !== "active") return { error: "Esta campanha não está recebendo doações.", checkoutUrl: null };
  const left = daysLeft(f.ends_at);
  if (left !== null && left <= 0) return { error: "O prazo desta campanha terminou.", checkoutUrl: null };

  const token = await getSellerAccessToken(admin, f.user_id);
  if (!token) return { error: "Esta campanha não pode receber doações agora. Avise quem a criou.", checkoutUrl: null };

  const { data: settings } = await admin.from("app_settings").select("fundraising_fee_bps").eq("id", true).maybeSingle();
  const feeBps = (settings as { fundraising_fee_bps?: number } | null)?.fundraising_fee_bps ?? 400;
  const { amountCents, tipCents, donorName, isAnonymous, message } = parsed.value;
  const charge = computeCharge(amountCents, tipCents, feeBps);

  const { data: donation, error } = await admin
    .from("fundraiser_donations")
    .insert({
      fundraiser_id: f.id,
      status: "pending",
      amount_cents: amountCents,
      tip_cents: tipCents,
      platform_fee_cents: charge.platformFeeCents,
      donor_name: donorName,
      is_anonymous: isAnonymous,
      message,
    })
    .select("id")
    .single();
  if (error || !donation) {
    console.error("[doacoes] falha ao registrar doação", error);
    return { error: "Não foi possível iniciar a doação. Tente de novo.", checkoutUrl: null };
  }

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        buildPreferenceBody({ donationId: donation.id, title: f.title, slug: f.slug, charge, siteUrl: SITE_URL })
      ),
    });
    if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
    const pref = (await res.json()) as { init_point?: string };
    if (!pref.init_point) throw new Error("sem init_point");
    return { error: null, checkoutUrl: pref.init_point };
  } catch (err) {
    console.error("[doacoes] falha ao criar cobrança", err);
    await admin.from("fundraiser_donations").update({ status: "failed" }).eq("id", donation.id);
    return { error: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.", checkoutUrl: null };
  }
}
