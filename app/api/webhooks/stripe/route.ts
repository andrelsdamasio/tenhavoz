import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { processStripeSession } from "@/lib/payment-sync";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Estes logs são o único jeito de descobrir, depois, por que um pagamento
  // não liberou a página: a Vercel guarda o console.error, o 400 sozinho não.
  if (!webhookSecret) {
    console.error("[webhook:stripe] STRIPE_WEBHOOK_SECRET não está configurada na Vercel.");
    return NextResponse.json({ error: "Webhook secret ausente." }, { status: 400 });
  }
  if (!signature) {
    console.error("[webhook:stripe] requisição sem o header stripe-signature.");
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  // Precisa do corpo bruto (não parseado) para validar a assinatura HMAC do Stripe.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    console.error(
      `[webhook:stripe] assinatura inválida (STRIPE_WEBHOOK_SECRET diferente da do endpoint cadastrado no Stripe?): ${message}`
    );
    return NextResponse.json({ error: `Assinatura inválida: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // "completed" chega pago na hora (cartão). Meios assíncronos (boleto,
      // Pix pelo Stripe) chegam aqui como "unpaid" e só viram pagos depois,
      // no evento async_payment_succeeded — que antes era ignorado, e por
      // isso quem pagava assim nunca tinha a página liberada.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await processStripeSession(createAdminClient(), session);
        console.log(
          `[webhook:stripe] ${event.type} sessão=${session.id} campanha=${result.campaignId} pagamento=${result.paymentStatus} publicada=${result.published}`
        );
        break;
      }

      // Reembolso feito manualmente no painel do Stripe — só refletimos o
      // status aqui pro relatório do /admin, nunca disparamos um reembolso a
      // partir do app. O evento vem preso ao charge/payment_intent, não à
      // checkout session que usamos como provider_payment_id, então achamos a
      // session correspondente antes de atualizar.
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

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
        break;
      }
    }
  } catch (err) {
    // 500 faz o Stripe reenviar o evento (com atraso crescente) em vez de
    // dar o pagamento por tratado.
    console.error(`[webhook:stripe] falha ao processar ${event.type} (${event.id}):`, err);
    return NextResponse.json({ error: "Falha ao processar o evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
