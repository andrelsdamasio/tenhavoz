import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidSignature } from "@/lib/mp-signature";
import { getSellerAccessToken } from "@/lib/mp-oauth";
import { judgePayment } from "@/lib/donations";

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
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    )
  ) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: donation } = await admin
    .from("fundraiser_donations")
    .select("id, fundraiser_id, status, amount_cents, tip_cents")
    .eq("id", donationId)
    .maybeSingle();
  if (!donation) return NextResponse.json({ received: true });

  const { data: fundraiser } = await admin.from("fundraisers").select("user_id").eq("id", donation.fundraiser_id).maybeSingle();
  if (!fundraiser) return NextResponse.json({ received: true });

  const token = await getSellerAccessToken(admin, fundraiser.user_id);
  if (!token) {
    console.error(`[mp-donations] sem token do criador para a doação ${donationId}`);
    return NextResponse.json({ error: "temporário" }, { status: 503 }); // o Mercado Pago tenta de novo
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return NextResponse.json({ received: true });
  if (!res.ok) return NextResponse.json({ error: "temporário" }, { status: 503 });

  const verdict = judgePayment(await res.json(), donation);
  if (verdict.kind === "reject") {
    console.error(`[mp-donations] pagamento ${paymentId} recusado: ${verdict.reason}`);
    return NextResponse.json({ received: true });
  }
  if (verdict.kind === "pending") return NextResponse.json({ received: true });

  if (verdict.kind === "approved") {
    // só muda se ainda não estava aprovada (idempotente)
    await admin
      .from("fundraiser_donations")
      .update({ status: "approved", provider_payment_id: paymentId, approved_at: new Date().toISOString() })
      .eq("id", donation.id)
      .neq("status", "approved");
  } else {
    await admin
      .from("fundraiser_donations")
      .update({ status: verdict.kind, provider_payment_id: paymentId })
      .eq("id", donation.id)
      .neq("status", verdict.kind);
  }
  return NextResponse.json({ received: true });
}
