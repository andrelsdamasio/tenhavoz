import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/payments";
import { publishCampaignAfterConfirmedPayment } from "@/lib/campaigns";
import { redeemCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Assinatura ou webhook secret ausente." },
      { status: 400 }
    );
  }

  // Precisa do corpo bruto (não parseado) para validar a assinatura HMAC do Stripe.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json(
      { error: `Assinatura inválida: ${message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const campaignId = session.metadata?.campaignId;
    const userId = session.metadata?.userId;
    const couponCode = session.metadata?.couponCode || null;

    if (!campaignId || !userId) {
      // Evento sem os metadados que sempre enviamos na criação da sessão —
      // não deveria acontecer, mas não vale a pena falhar o webhook por isso.
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();

    await recordPayment(admin, {
      userId,
      campaignId,
      provider: "stripe",
      providerPaymentId: session.id,
      status: session.payment_status === "paid" ? "confirmed" : "pending",
      amount: (session.amount_total ?? 0) / 100,
      couponCode,
    });

    if (session.payment_status === "paid") {
      const { alreadyPublished } = await publishCampaignAfterConfirmedPayment(admin, campaignId);
      if (!alreadyPublished && couponCode) {
        await redeemCoupon(admin, couponCode);
      }
    }
  }

  // Reembolso feito manualmente no painel do Stripe — só refletimos o
  // status aqui pro relatório do /admin, nunca disparamos um reembolso a
  // partir do app. O evento vem preso ao charge/payment_intent, não à
  // checkout session que usamos como provider_payment_id, então achamos a
  // session correspondente antes de atualizar.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

    if (paymentIntentId) {
      const sessions = await getStripe().checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      const session = sessions.data[0];

      if (session) {
        await createAdminClient()
          .from("payments")
          .update({ status: "refunded" })
          .eq("provider", "stripe")
          .eq("provider_payment_id", session.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
