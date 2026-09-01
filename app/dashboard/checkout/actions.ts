"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignForOwner } from "@/lib/campaigns";
import { getStripe } from "@/lib/stripe";
import { getMercadoPagoPreferenceClient } from "@/lib/mercadopago";
import { getAppSettings } from "@/lib/settings";

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

export async function startStripeCheckout(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { user, campaign, priceCents } = await getOwnedCampaignOrRedirect(campaignId);

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
    },
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/dashboard/checkout?campaignId=${campaign.id}&canceled=1`,
  });

  if (!session.url) {
    throw new Error("Stripe não retornou uma URL de checkout.");
  }

  redirect(session.url);
}

export async function startMercadoPagoCheckout(formData: FormData) {
  const campaignId = String(formData.get("campaignId") ?? "");
  const { campaign, priceCents } = await getOwnedCampaignOrRedirect(campaignId);

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
      back_urls: {
        success: `${siteUrl}/dashboard?checkout=success`,
        pending: `${siteUrl}/dashboard?checkout=pending`,
        failure: `${siteUrl}/dashboard/checkout?campaignId=${campaign.id}&canceled=1`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    },
  });

  const checkoutUrl = preference.init_point;
  if (!checkoutUrl) {
    throw new Error("Mercado Pago não retornou uma URL de checkout.");
  }

  redirect(checkoutUrl);
}
