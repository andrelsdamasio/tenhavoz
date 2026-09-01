"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignForOwner, publishCampaignAfterConfirmedPayment } from "@/lib/campaigns";
import { getStripe } from "@/lib/stripe";
import { getMercadoPagoPreferenceClient } from "@/lib/mercadopago";
import { getAppSettings } from "@/lib/settings";
import { isAdminEmail } from "@/lib/admin";
import { applyCouponDiscount, findUsableCoupon, normalizeCouponCode } from "@/lib/coupons";

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

  const { campaign_price_brl_cents: priceCents } = await getAppSettings(supabase);

  return { user, campaign, priceCents };
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
  const { user, campaign, priceCents: basePriceCents } = await getOwnedCampaignOrRedirect(
    campaignId
  );
  const { priceCents, couponCode } = await resolvePriceWithCoupon(
    basePriceCents,
    String(formData.get("couponCode") ?? "")
  );

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
            name: `Campanha: ${campaign.title}`,
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
  const { campaign, priceCents: basePriceCents } = await getOwnedCampaignOrRedirect(campaignId);
  const { priceCents, couponCode } = await resolvePriceWithCoupon(
    basePriceCents,
    String(formData.get("couponCode") ?? "")
  );

  const preferenceClient = getMercadoPagoPreferenceClient();
  const siteUrl = getSiteUrl();

  const preference = await preferenceClient.create({
    body: {
      items: [
        {
          id: campaign.id,
          title: `Campanha: ${campaign.title}`,
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
 * Publica a campanha sem passar pelo checkout — restrito à conta admin
 * (ADMIN_EMAILS), para permitir testar/usar o produto sem pagar. Não gera
 * nenhuma linha em payments; só reaproveita a mesma função que os webhooks
 * usam para publicar.
 */
export async function publishFreeAsAdmin(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, campaign } = await getOwnedCampaignOrRedirect(campaignId);

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  await publishCampaignAfterConfirmedPayment(createAdminClient(), campaign.id);

  redirect("/dashboard");
}
