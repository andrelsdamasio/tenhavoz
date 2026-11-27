import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSignature } from "@/lib/mp-signature";
import { syncDonationPayment } from "@/lib/donation-sync";

/**
 * Aviso de pagamento de uma doação. O aviso só diz "consulte o pagamento X":
 * quem decide é a consulta que fazemos à API do Mercado Pago com o token do
 * criador. É idempotente — o mesmo aviso várias vezes não duplica nada.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const donationId = url.searchParams.get("d");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (body as { type?: string }).type;
  const paymentId =
    url.searchParams.get("data.id") ?? (body as { data?: { id?: string | number } }).data?.id?.toString() ?? null;

  if (type !== "payment" || !paymentId || !donationId || !/^[0-9a-f-]{36}$/i.test(donationId)) {
    return NextResponse.json({ received: true });
  }

  if (
    !isValidSignature(
      request.headers.get("x-signature"),
      request.headers.get("x-request-id"),
      paymentId,
      process.env.MP_DONATIONS_WEBHOOK_SECRET
    )
  ) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const result = await syncDonationPayment(createAdminClient(), donationId, paymentId);
  if (result === "retry") return NextResponse.json({ error: "temporário" }, { status: 503 });
  return NextResponse.json({ received: true });
}
