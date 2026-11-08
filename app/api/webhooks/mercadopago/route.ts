import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMercadoPagoPaymentById } from "@/lib/payment-sync";
import { isValidSignature } from "@/lib/mp-signature";

/**
 * O Mercado Pago responde 404 quando o id não existe (aviso de teste, id
 * forjado ou pagamento de outra conta). Reenviar não adianta: respondemos 200
 * para ele parar de tentar, e o log guarda o caso.
 */
function isPaymentNotFound(err: unknown): boolean {
  const e = err as { status?: number; statusCode?: number; message?: string } | null;
  return e?.status === 404 || e?.statusCode === 404 || /payment not found/i.test(e?.message ?? "");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);

  // O Mercado Pago tem dois formatos de aviso:
  //  - webhook:  ?data.id=123&type=payment   (+ header x-signature)
  //  - IPN:      ?id=123&topic=payment       (sem assinatura)
  // Só o primeiro era tratado; se a conta estivesse mandando o segundo, todo
  // aviso era ignorado com 200 e nenhuma campanha era liberada.
  const isIpn = !url.searchParams.has("type") && url.searchParams.get("topic") === "payment";
  const type =
    url.searchParams.get("type") ??
    url.searchParams.get("topic") ??
    (body as { type?: string }).type;
  const dataId =
    url.searchParams.get("data.id") ??
    (isIpn ? url.searchParams.get("id") : null) ??
    (body as { data?: { id?: string | number } }).data?.id?.toString() ??
    null;

  if (type !== "payment" || !dataId) {
    console.log(`[webhook:mercadopago] ignorado: type=${type ?? "?"} id=${dataId ?? "?"}`);
    return NextResponse.json({ received: true });
  }

  // O IPN não traz assinatura. Não é um risco: a decisão abaixo nunca usa o
  // conteúdo do aviso, só o pagamento que buscamos na API do Mercado Pago
  // com o nosso token — um aviso forjado só faz reconsultar um pagamento real.
  if (!isIpn) {
    const valid = isValidSignature(
      request.headers.get("x-signature"),
      request.headers.get("x-request-id"),
      dataId,
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!valid) {
      console.error(
        "[webhook:mercadopago] assinatura inválida — a MERCADOPAGO_WEBHOOK_SECRET da Vercel precisa ser a chave secreta do webhook em Suas integrações > Webhooks (modo produção, não teste).",
        { dataId, temSignature: request.headers.has("x-signature") }
      );
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
    }
  }

  try {
    const result = await syncMercadoPagoPaymentById(createAdminClient(), dataId);
    console.log(
      `[webhook:mercadopago] pagamento=${dataId} campanha=${result.campaignId} status=${result.paymentStatus} publicada=${result.published}`
    );
  } catch (err) {
    if (isPaymentNotFound(err)) {
      console.warn(`[webhook:mercadopago] pagamento ${dataId} não existe no Mercado Pago; ignorado`);
      return NextResponse.json({ received: true, ignored: "payment_not_found" });
    }
    // 500 faz o Mercado Pago reenviar o aviso mais tarde.
    console.error(`[webhook:mercadopago] falha ao processar o pagamento ${dataId}:`, err);
    return NextResponse.json({ error: "Falha ao processar o pagamento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
