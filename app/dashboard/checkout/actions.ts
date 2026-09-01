"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCampaignForOwner,
  publishCampaignAfterConfirmedPayment,
  setCampaignDuration,
} from "@/lib/campaigns";
import { getStripe } from "@/lib/stripe";
import { getMercadoPagoPreferenceClient } from "@/lib/mercadopago";
import { getAppSettings } from "@/lib/settings";
import { isAdminEmail } from "@/lib/admin";
import type { CampaignDuration } from "@/lib/types";
import {
  applyCouponDiscount,
  findUsableCoupon,
  normalizeCouponCode,
  redeemCoupon,
} from "@/lib/coupons";

async function getOwnedCampaignOrRedirect(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaign = await getCampaignForOwner(supabase, campaignId);

  if (!campaign || campaign.user_id !== user.id) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings(supabase);

  return { user, supabase, campaign, settings };
}

/**
 * Lê o prazo escolhido no checkout ("72" ou "168" horas) e resolve o preço
 * base correspondente. Prazo ausente/inválido manda a pessoa de volta pro
 * checkout em vez de deixar seguir com um preço arbitrário.
 */
function resolveDuration(
  formData: FormData,
  settings: { price_72h_brl_cents: number; price_7d_brl_cents: number },
  campaignId: string
): { duration: CampaignDuration; basePriceCents: number } {
  const raw = String(formData.get("duration") ?? "");
  if (raw === "72") {
    return { duration: 72, basePriceCents: settings.price_72h_brl_cents };
  }
  if (raw === "168") {
    return { duration: 168, basePriceCents: settings.price_7d_brl_cents };
  }
  redirect(`/dashboard/checkout?campaignId=${campaignId}&planInvalid=1`);
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Revalida o cupom no servidor (nunca confia no desconto calculado no
 * cliente) e devolve o preço final. Cupom inválido/expirado/sem saldo é
 * silenciosamente ignorado aqui — a validação com mensagem de erro pro
 * usuário acontece antes, em validateCouponAction.
 */
async function resolvePriceWithCoupon(
  basePriceCents: number,
  couponCodeRaw: string
): Promise<{ priceCents: number; couponCode: string | null }> {
  const couponCode = normalizeCouponCode(couponCodeRaw);
  if (!couponCode) return { priceCents: basePriceCents, couponCode: null };

  const admin = createAdminClient();
  const coupon = await findUsableCoupon(admin, couponCode);
  if (!coupon) return { priceCents: basePriceCents, couponCode: null };

  return { priceCents: applyCouponDiscount(basePriceCents, coupon), couponCode: coupon.code };
}

export interface ValidateCouponState {
  error: string | null;
  appliedCode: string | null;
  discountedPriceCents: number | null;
}

export async function validateCouponAction(
  _prevState: ValidateCouponState,
  formData: FormData
): Promise<ValidateCouponState> {
  const priceCents = Number(formData.get("priceCents") ?? "0");
  const rawCode = String(formData.get("couponCode") ?? "");

  const admin = createAdminClient();
  const coupon = await findUsableCoupon(admin, rawCode);

  if (!coupon) {
    return {
      error: "Cupom inválido, expirado ou já esgotado.",
      appliedCode: null,
      discountedPriceCents: null,
    };
  }

  return {
    error: null,
    appliedCode: coupon.code,
    discountedPriceCents: applyCouponDiscount(priceCents, coupon),
  };
}

export async function startStripeCheckout(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, supabase, campaign, settings } = await getOwnedCampaignOrRedirect(campaignId);
  const { duration, basePriceCents } = resolveDuration(formData, settings, campaignId);
  const { priceCents, couponCode } = await resolvePriceWithCoupon(
    basePriceCents,
    String(formData.get("couponCode") ?? "")
  );

  await setCampaignDuration(supabase, campaign.id, user.id, duration);

  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "brl",
          unit_amount: priceCents,
          product_data: {
            name: "Publicação de campanha — TenhaVoz",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      campaignId: campaign.id,
      userId: user.id,
      couponCode: couponCode ?? "",
    },
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/dashboard/checkout?campaignId=${campaign.id}&canceled=1`,
  });

  if (!session.url) {
    throw new Error("Stripe não retornou uma URL de checkout.");
  }

  redirect(session.url);
}

async function createMercadoPagoPreference(
  formData: FormData,
  options?: { pixOnly?: boolean }
) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, supabase, campaign, settings } = await getOwnedCampaignOrRedirect(campaignId);
  const { duration, basePriceCents } = resolveDuration(formData, settings, campaignId);
  const { priceCents, couponCode } = await resolvePriceWithCoupon(
    basePriceCents,
    String(formData.get("couponCode") ?? "")
  );

  await setCampaignDuration(supabase, campaign.id, user.id, duration);

  const preferenceClient = getMercadoPagoPreferenceClient();
  const siteUrl = getSiteUrl();

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: campaign.id,
          title: "Publicação de campanha — TenhaVoz",
          quantity: 1,
          unit_price: priceCents / 100,
          currency_id: "BRL",
        },
      ],
      external_reference: campaign.id,
      metadata: {
        coupon_code: couponCode ?? "",
      },
      back_urls: {
        success: `${siteUrl}/dashboard?checkout=success`,
        pending: `${siteUrl}/dashboard?checkout=pending`,
        failure: `${siteUrl}/dashboard/checkout?campaignId=${campaign.id}&canceled=1`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      ...(options?.pixOnly
        ? {
            payment_methods: {
              excluded_payment_types: [
                { id: "credit_card" },
                { id: "debit_card" },
                { id: "ticket" },
                { id: "atm" },
              ],
            },
          }
        : {}),
    },
  });

  const checkoutUrl = preference.init_point;
  if (!checkoutUrl) {
    throw new Error("Mercado Pago não retornou uma URL de checkout.");
  }

  return checkoutUrl;
}

export async function startMercadoPagoCheckout(formData: FormData) {
  const checkoutUrl = await createMercadoPagoPreference(formData);
  redirect(checkoutUrl);
}

/**
 * Mesmo fluxo do Mercado Pago, mas restringindo o preference a Pix — o
 * Checkout Pro pula a tela de seleção de meio de pagamento e vai direto pro
 * QR code/código copia-e-cola quando só há um método disponível.
 */
export async function startPixCheckout(formData: FormData) {
  const checkoutUrl = await createMercadoPagoPreference(formData, { pixOnly: true });
  redirect(checkoutUrl);
}

/**
 * Publica a campanha sem cobrar nada quando um cupom zera o preço — revalida
 * o cupom e o preço no servidor antes de publicar (nunca confia no valor
 * mostrado no cliente), e conta o resgate do cupom como qualquer outro
 * pagamento confirmado. Se o preço recalculado não for zero (cupom expirou
 * entre a pré-visualização e o clique, por exemplo), manda a pessoa de volta
 * pro checkout para escolher uma forma de pagamento.
 */
export async function claimFreeCampaign(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, supabase, campaign, settings } = await getOwnedCampaignOrRedirect(campaignId);
  const { duration, basePriceCents } = resolveDuration(formData, settings, campaignId);
  const { priceCents, couponCode } = await resolvePriceWithCoupon(
    basePriceCents,
    String(formData.get("couponCode") ?? "")
  );

  if (priceCents !== 0) {
    redirect(`/dashboard/checkout?campaignId=${campaign.id}&couponExpired=1`);
  }

  await setCampaignDuration(supabase, campaign.id, user.id, duration);

  const admin = createAdminClient();
  const { alreadyPublished } = await publishCampaignAfterConfirmedPayment(admin, campaign.id);
  if (!alreadyPublished && couponCode) {
    await redeemCoupon(admin, couponCode);
  }

  redirect("/dashboard?checkout=success");
}

/**
 * Publica a campanha sem passar pelo checkout — restrito à conta admin
 * (ADMIN_EMAILS), para permitir testar/usar o produto sem pagar. Não gera
 * nenhuma linha em payments; só reaproveita a mesma função que os webhooks
 * usam para publicar. Sempre usa o prazo de 7 dias, já que é só um atalho de
 * teste sem tela de escolha de prazo.
 */
export async function publishFreeAsAdmin(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, supabase, campaign } = await getOwnedCampaignOrRedirect(campaignId);

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  await setCampaignDuration(supabase, campaign.id, user.id, 168);
  await publishCampaignAfterConfirmedPayment(createAdminClient(), campaign.id);

  redirect("/dashboard");
}
