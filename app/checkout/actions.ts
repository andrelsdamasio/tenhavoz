"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { syncMercadoPagoPaymentById, type SyncResult } from "@/lib/payment-sync";
import { getMercadoPagoPaymentClient } from "@/lib/mercadopago";
import { adRef, processAdPayment } from "@/lib/ad-payments";
import { syncDonationPayment } from "@/lib/donation-sync";
import type { PixOutcome } from "@/lib/checkout-pix";

export type PixKind = "campaign" | "ad" | "donation";

function fromSync(r: SyncResult): PixOutcome {
  if (r.published) return "approved";
  if (r.paymentStatus === "failed" || r.paymentStatus === "refunded") return "failed";
  return "pending";
}

/**
 * A tela de Pix pergunta aqui, de tempos em tempos, se o pagamento caiu. A
 * resposta vem sempre da consulta ao Mercado Pago (o webhook pode demorar ou
 * falhar), e só devolve o resultado — nunca dados do pagamento.
 */
export async function checkPixAction(kind: PixKind, paymentId: string, ref: string): Promise<PixOutcome> {
  if (!/^\d{1,20}$/.test(paymentId)) return "pending";
  try {
    const admin = createAdminClient();
    if (kind === "campaign") return fromSync(await syncMercadoPagoPaymentById(admin, paymentId));
    if (kind === "ad") {
      const payment = await getMercadoPagoPaymentClient().get({ id: paymentId });
      if (payment.external_reference !== adRef(ref)) return "pending";
      const r = await processAdPayment(admin, payment);
      return r.outcome === "approved" ? "approved" : r.outcome === "failed" ? "failed" : "pending";
    }
    const r = await syncDonationPayment(admin, ref, paymentId);
    return r === "approved" ? "approved" : r === "failed" ? "failed" : "pending";
  } catch (err) {
    console.error("[checkout] falha ao consultar o Pix", { kind, err });
    return "pending";
  }
}
