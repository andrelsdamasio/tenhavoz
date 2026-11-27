/**
 * Pix dentro do próprio TenhaVoz: em vez de mandar a pessoa para a tela do
 * Mercado Pago, criamos o pagamento Pix pela API de Pagamentos e mostramos o
 * QR code e o copia-e-cola na nossa página. O dinheiro continua caindo no
 * Mercado Pago (da plataforma, ou do criador na doação) e a confirmação
 * continua vindo dos webhooks / da consulta ao Mercado Pago.
 */

export interface PixCharge {
  /** Id do pagamento no Mercado Pago. */
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string;
}

export interface CreatePixInput {
  accessToken: string;
  amountCents: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  notificationUrl: string;
  metadata?: Record<string, string>;
  /** Comissão da plataforma (só com token de vendedor, como na doação). */
  applicationFeeCents?: number;
  /** Mesma chave = mesma cobrança, se a pessoa clicar duas vezes. */
  idempotencyKey: string;
  /** Minutos até o Pix vencer. */
  expiresInMinutes?: number;
  now?: number;
}

/** Corpo enviado ao Mercado Pago (separado para poder testar sem rede). */
export function buildPixBody(input: CreatePixInput) {
  const expires = new Date((input.now ?? Date.now()) + (input.expiresInMinutes ?? 60) * 60_000);
  return {
    transaction_amount: Math.round(input.amountCents) / 100,
    description: input.description.slice(0, 200),
    payment_method_id: "pix",
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    date_of_expiration: expires.toISOString().replace("Z", "+00:00"),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.applicationFeeCents ? { application_fee: Math.round(input.applicationFeeCents) / 100 } : {}),
  };
}

export class PixError extends Error {}

export async function createPixCharge(input: CreatePixInput): Promise<PixCharge> {
  const body = buildPixBody(input);
  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new PixError(`Mercado Pago ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = (await res.json()) as {
    id?: number | string;
    status?: string;
    date_of_expiration?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  };
  const tx = data.point_of_interaction?.transaction_data;
  if (data.id === undefined || !tx?.qr_code) throw new PixError("O Mercado Pago não devolveu o código Pix.");
  return {
    paymentId: String(data.id),
    status: data.status ?? "pending",
    qrCode: tx.qr_code,
    qrCodeBase64: tx.qr_code_base64 ?? null,
    ticketUrl: tx.ticket_url ?? null,
    expiresAt: data.date_of_expiration ?? body.date_of_expiration,
  };
}

/** Resultado que o navegador entende, sem nenhum dado sensível. */
export type PixView = Pick<PixCharge, "paymentId" | "qrCode" | "qrCodeBase64" | "expiresAt">;

export function toPixView(c: PixCharge): PixView {
  return { paymentId: c.paymentId, qrCode: c.qrCode, qrCodeBase64: c.qrCodeBase64, expiresAt: c.expiresAt };
}

/** Status do Mercado Pago → o que a tela mostra. */
export type PixOutcome = "approved" | "pending" | "failed";

export function pixOutcome(mpStatus: string | undefined): PixOutcome {
  if (mpStatus === "approved") return "approved";
  if (mpStatus === "rejected" || mpStatus === "cancelled" || mpStatus === "refunded" || mpStatus === "charged_back") return "failed";
  return "pending";
}
