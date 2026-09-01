import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getMercadoPagoPaymentClient } from "@/lib/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/payments";
import { publishCampaignAfterConfirmedPayment } from "@/lib/campaigns";
import { redeemCoupon } from "@/lib/coupons";

/**
 * Valida o header x-signature do Mercado Pago.
 * Formato: "ts=<timestamp>,v1=<hash>"
 * manifest = "id:{dataId};request-id:{xRequestId};ts:{ts};"
 * hash esperado = HMAC-SHA256(manifest, MERCADOPAGO_WEBHOOK_SECRET) em hex.
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function isValidSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true; // sem secret configurado, não bloqueia o MVP — ver README.
  if (!xSignature || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(receivedHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);

  const type = url.searchParams.get("type") ?? (body as { type?: string }).type;
  const dataId =
    url.searchParams.get("data.id") ??
    (body as { data?: { id?: string } }).data?.id ??
    null;

  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  const valid = isValidSignature(
    request.headers.get("x-signature"),
    request.headers.get("x-request-id"),
    dataId,
    process.env.MERCADOPAGO_WEBHOOK_SECRET
  );

  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const paymentClient = getMercadoPagoPaymentClient();
  const payment = await paymentClient.get({ id: dataId });

  const campaignId = payment.external_reference;
  if (!campaignId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("user_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !campaign) {
    return NextResponse.json({ received: true });
  }

  const isApproved = payment.status === "approved";
  const couponCode =
    (payment.metadata as Record<string, unknown> | undefined)?.coupon_code ||
    (payment.metadata as Record<string, unknown> | undefined)?.couponCode ||
    null;
  const couponCodeStr = typeof couponCode === "string" && couponCode ? couponCode : null;

  await recordPayment(admin, {
    userId: campaign.user_id,
    campaignId,
    provider: "mercadopago",
    providerPaymentId: String(payment.id),
    status:
      payment.status === "refunded"
        ? "refunded"
        : isApproved
          ? "confirmed"
          : payment.status === "rejected"
            ? "failed"
            : "pending",
    amount: payment.transaction_amount ?? 0,
    couponCode: couponCodeStr,
  });

  if (isApproved) {
    const { alreadyPublished } = await publishCampaignAfterConfirmedPayment(admin, campaignId);
    if (!alreadyPublished && couponCodeStr) {
      await redeemCoupon(admin, couponCodeStr);
    }
  }

  return NextResponse.json({ received: true });
}
