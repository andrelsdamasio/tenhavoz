import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeAndForwardEmail, verifyResendSignature } from "@/lib/inbox";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook:resend] RESEND_WEBHOOK_SECRET não está configurada na Vercel.");
    return NextResponse.json({ error: "Webhook secret ausente." }, { status: 400 });
  }

  // Corpo bruto: a assinatura é calculada sobre ele.
  const rawBody = await request.text();
  const valid = verifyResendSignature(
    rawBody,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret
  );
  if (!valid) {
    console.error("[webhook:resend] assinatura inválida (RESEND_WEBHOOK_SECRET diferente da do webhook?).");
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await storeAndForwardEmail(createAdminClient(), event.data.email_id);
    console.log(
      `[webhook:resend] e-mail ${event.data.email_id} guardado=${result.stored} encaminhado=${result.forwarded}`
    );
  } catch (err) {
    // 500 faz o Resend reenviar o webhook mais tarde.
    console.error(`[webhook:resend] falha ao processar o e-mail ${event.data.email_id}:`, err);
    return NextResponse.json({ error: "Falha ao processar o e-mail." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
