"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { buildPreferenceBody, computeCharge, parseDonationForm } from "@/lib/donations";
import { getSellerAccessToken, SITE_URL } from "@/lib/mp-oauth";
import { daysLeft } from "@/lib/fundraiser-public";
import { createPixCharge, toPixView, type PixView } from "@/lib/checkout-pix";

export interface DonateState {
  error: string | null;
  checkoutUrl: string | null;
}

export interface DonatePixState {
  error: string | null;
  pix: PixView | null;
  donationId: string | null;
}

type Prepared =
  | { ok: false; error: string }
  | {
      ok: true;
      admin: ReturnType<typeof createAdminClient>;
      token: string;
      donationId: string;
      donorEmail: string;
      title: string;
      slug: string;
      charge: ReturnType<typeof computeCharge>;
    };

/** Valida a doação, confere a campanha e grava a doação como "pendente". */
async function prepareDonation(slug: string, formData: FormData): Promise<Prepared> {
  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) return { ok: false, error: "Doações indisponíveis no momento." };

  const parsed = parseDonationForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: f } = await admin
    .from("fundraisers")
    .select("id, user_id, title, slug, status, ends_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!f || f.status !== "active") return { ok: false, error: "Esta campanha não está recebendo doações." };
  const left = daysLeft(f.ends_at);
  if (left !== null && left <= 0) return { ok: false, error: "O prazo desta campanha terminou." };

  const token = await getSellerAccessToken(admin, f.user_id);
  if (!token) return { ok: false, error: "Esta campanha não pode receber doações agora. Avise quem a criou." };

  const { data: settings } = await admin.from("app_settings").select("fundraising_fee_bps").eq("id", true).maybeSingle();
  const feeBps = (settings as { fundraising_fee_bps?: number } | null)?.fundraising_fee_bps ?? 400;
  const { amountCents, tipCents, donorName, donorEmail, isAnonymous, message } = parsed.value;
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
      donor_email: donorEmail,
      is_anonymous: isAnonymous,
      message,
    })
    .select("id")
    .single();
  if (error || !donation) {
    console.error("[doacoes] falha ao registrar doação", error);
    return { ok: false, error: "Não foi possível iniciar a doação. Tente de novo." };
  }
  return { ok: true, admin, token, donationId: donation.id, donorEmail, title: f.title, slug: f.slug, charge };
}

/** Pix na própria página: a cobrança sai na conta de quem criou a campanha. */
export async function donatePixAction(slug: string, _prev: DonatePixState, formData: FormData): Promise<DonatePixState> {
  const p = await prepareDonation(slug, formData);
  if (!p.ok) return { error: p.error, pix: null, donationId: null };
  try {
    const charge = await createPixCharge({
      accessToken: p.token,
      amountCents: p.charge.totalCents,
      description: `Doação: ${p.title}`,
      externalReference: p.donationId,
      payerEmail: p.donorEmail,
      notificationUrl: `${SITE_URL}/api/webhooks/mp-donations?d=${p.donationId}`,
      applicationFeeCents: p.charge.marketplaceFeeCents,
      idempotencyKey: `don-${p.donationId}`,
    });
    return { error: null, pix: toPixView(charge), donationId: p.donationId };
  } catch (err) {
    console.error("[doacoes] falha ao gerar o Pix", err);
    await p.admin.from("fundraiser_donations").update({ status: "failed" }).eq("id", p.donationId);
    return { error: "Não foi possível gerar o Pix agora. Tente de novo em instantes.", pix: null, donationId: null };
  }
}

/** Cartão e outros meios na tela segura do Mercado Pago; devolve o link de pagamento. */
export async function donateAction(slug: string, _prev: DonateState, formData: FormData): Promise<DonateState> {
  const p = await prepareDonation(slug, formData);
  if (!p.ok) return { error: p.error, checkoutUrl: null };
  const { admin, token, donationId, title, charge } = p;

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildPreferenceBody({ donationId, title, slug: p.slug, charge, siteUrl: SITE_URL })),
    });
    if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${await res.text()}`);
    const pref = (await res.json()) as { init_point?: string };
    if (!pref.init_point) throw new Error("sem init_point");
    return { error: null, checkoutUrl: pref.init_point };
  } catch (err) {
    console.error("[doacoes] falha ao criar cobrança", err);
    await admin.from("fundraiser_donations").update({ status: "failed" }).eq("id", donationId);
    return { error: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.", checkoutUrl: null };
  }
}
