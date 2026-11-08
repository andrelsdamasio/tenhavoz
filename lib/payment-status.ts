import type { ReconcileOutcome } from "@/lib/payment-sync";

export type PaymentView =
  | "published" // pago e no ar
  | "not_started" // a pessoa ainda não chegou a iniciar o pagamento
  | "pending" // pagamento encontrado, aguardando compensação (Pix/boleto)
  | "not_found" // iniciou o checkout, mas não achamos pagamento
  | "unavailable"; // não deu para consultar o provedor agora

/** Traduz o resultado da conferência no estado mostrado ao cliente. */
export function describePaymentState(
  campaign: { status: string; duration_hours: number | null },
  outcome: ReconcileOutcome | null
): PaymentView {
  if (campaign.status === "published" || outcome?.published) return "published";
  if (campaign.duration_hours === null) return "not_started";
  if (!outcome) return "unavailable";
  if (outcome.pending > 0) return "pending";
  if (outcome.found === 0 && outcome.errors.length > 0) return "unavailable";
  return "not_found";
}
