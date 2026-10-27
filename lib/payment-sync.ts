import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Campaign, Database, PaymentStatus } from "@/lib/types";
import { recordPayment } from "@/lib/payments";
import { publishCampaignAfterConfirmedPayment } from "@/lib/campaigns";
import { redeemCoupon } from "@/lib/coupons";
import { getStripe } from "@/lib/stripe";
import { getMercadoPagoPaymentClient } from "@/lib/mercadopago";
import { notifyCustomerPaymentConfirmed } from "@/lib/notifications";

/**
 * Confirmação de pagamento, num lugar só.
 *
 * Antes, a campanha só era liberada se o WEBHOOK do provedor chegasse e fosse
 * aceito. Qualquer falha ali (secret errado, endpoint não cadastrado, formato
 * de notificação diferente, campanha apagada no meio) deixava quem pagou sem
 * a página, e sem nenhum rastro. Agora a mesma lógica serve a três caminhos:
 * o webhook, a volta do cliente do checkout e o botão "Já paguei", todos
 * consultando o provedor — a fonte da verdade — e todos idempotentes.
 */

export interface SyncResult {
  /** Campanha a que o pagamento se refere; null se não foi possível saber. */
  campaignId: string | null;
  /** Status gravado em payments; null se nada foi gravado. */
  paymentStatus: PaymentStatus | null;
  /** true se, depois disto, a campanha está publicada. */
  published: boolean;
}

/** Teto de sessões do Stripe varridas por verificação (evita paginar sem fim). */
const MAX_STRIPE_SESSIONS_SCANNED = 500;

const NOTHING: SyncResult = { campaignId: null, paymentStatus: null, published: false };

type Admin = SupabaseClient<Database>;

/**
 * Grava o pagamento sem desfazer um reembolso. O Stripe continua dizendo
 * "paid" numa sessão já reembolsada; sem esta checagem, reprocessar a sessão
 * (reentrega de webhook, botão "Já paguei") sobrescreveria "refunded" por
 * "confirmed" e a receita voltaria a contar. Devolve o status que ficou.
 */
async function recordKeepingRefunds(
  admin: Admin,
  input: Parameters<typeof recordPayment>[1]
): Promise<PaymentStatus> {
  const { data } = await admin
    .from("payments")
    .select("status")
    .eq("provider", input.provider)
    .eq("provider_payment_id", input.providerPaymentId)
    .maybeSingle();

  if (data?.status === "refunded" && input.status !== "refunded") return "refunded";

  await recordPayment(admin, input);
  return input.status;
}

async function publishAndRedeem(
  admin: Admin,
  campaignId: string,
  couponCode: string | null
): Promise<void> {
  const { campaign, alreadyPublished } = await publishCampaignAfterConfirmedPayment(admin, campaignId);
  if (alreadyPublished) return;

  if (couponCode) await redeemCoupon(admin, couponCode);
  // Só na primeira publicação: avisa a pessoa que está no ar (evita ela achar
  // que "não liberou"). Nunca derruba a liberação.
  await notifyCustomerPaymentConfirmed(admin, campaign);
}

/** Grava e, se pago, publica a partir de uma Checkout Session do Stripe. */
export async function processStripeSession(
  admin: Admin,
  session: Stripe.Checkout.Session
): Promise<SyncResult> {
  const campaignId = session.metadata?.campaignId;
  const userId = session.metadata?.userId;
  const couponCode = session.metadata?.couponCode || null;

  if (!campaignId || !userId) {
    console.warn("[payment-sync] sessão Stripe sem campaignId/userId nos metadados", {
      sessionId: session.id,
    });
    return NOTHING;
  }

  const paid = session.payment_status === "paid";

  const status = await recordKeepingRefunds(admin, {
    userId,
    campaignId,
    provider: "stripe",
    providerPaymentId: session.id,
    status: paid ? "confirmed" : "pending",
    amount: (session.amount_total ?? 0) / 100,
    couponCode,
  });

  const releasable = paid && status === "confirmed";
  if (releasable) await publishAndRedeem(admin, campaignId, couponCode);

  return { campaignId, paymentStatus: status, published: releasable };
}

/** Forma mínima de um pagamento do Mercado Pago que usamos. */
export interface MercadoPagoPaymentLike {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  metadata?: unknown;
}

function mercadoPagoStatus(status: string | undefined): PaymentStatus {
  if (status === "approved") return "confirmed";
  if (status === "refunded" || status === "charged_back") return "refunded";
  if (status === "rejected" || status === "cancelled") return "failed";
  return "pending";
}

/** Grava e, se aprovado, publica a partir de um pagamento do Mercado Pago. */
export async function processMercadoPagoPayment(
  admin: Admin,
  payment: MercadoPagoPaymentLike
): Promise<SyncResult> {
  const campaignId = payment.external_reference;
  if (!campaignId || payment.id === undefined) {
    console.warn("[payment-sync] pagamento Mercado Pago sem external_reference", {
      paymentId: payment.id,
    });
    return NOTHING;
  }

  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("user_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) throw error;

  if (!campaign) {
    // Dinheiro recebido por uma campanha que não existe mais (apagada pelo
    // cliente depois de pagar, por exemplo). Antes isto sumia em silêncio.
    console.error(
      "[payment-sync] ATENÇÃO: pagamento Mercado Pago de campanha inexistente — verificar/reembolsar",
      { paymentId: payment.id, campaignId, status: payment.status }
    );
    return { campaignId, paymentStatus: null, published: false };
  }

  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
  const rawCoupon = metadata.coupon_code || metadata.couponCode;
  const couponCode = typeof rawCoupon === "string" && rawCoupon ? rawCoupon : null;

  const status = await recordKeepingRefunds(admin, {
    userId: campaign.user_id,
    campaignId,
    provider: "mercadopago",
    providerPaymentId: String(payment.id),
    status: mercadoPagoStatus(payment.status),
    amount: payment.transaction_amount ?? 0,
    couponCode,
  });

  const approved = status === "confirmed";
  if (approved) await publishAndRedeem(admin, campaignId, couponCode);

  return { campaignId, paymentStatus: status, published: approved };
}

/** Consulta um pagamento no Mercado Pago pelo id e processa. */
export async function syncMercadoPagoPaymentById(
  admin: Admin,
  paymentId: string
): Promise<SyncResult> {
  if (!/^\d{1,20}$/.test(paymentId)) return NOTHING;
  const payment = await getMercadoPagoPaymentClient().get({ id: paymentId });
  return processMercadoPagoPayment(admin, payment);
}

/** Consulta uma Checkout Session no Stripe pelo id e processa. */
export async function syncStripeSessionById(admin: Admin, sessionId: string): Promise<SyncResult> {
  if (!/^cs_[A-Za-z0-9_]{6,200}$/.test(sessionId)) return NOTHING;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return processStripeSession(admin, session);
}

export interface ReconcileOutcome {
  /** A campanha está publicada depois da verificação. */
  published: boolean;
  /** Quantos pagamentos desta campanha foram encontrados nos provedores. */
  found: number;
  /** Quantos deles ainda estão em análise (Pix/boleto aguardando compensação). */
  pending: number;
  /** Provedores que não puderam ser consultados (para log; nunca vai ao cliente). */
  errors: string[];
}

/**
 * Procura nos provedores pagamentos desta campanha e processa os que achar.
 * Usado pelo botão "Já paguei": funciona mesmo que nenhum webhook tenha
 * chegado. Cada provedor é consultado separado — se o Stripe nem estiver
 * configurado, o Mercado Pago ainda é verificado (e vice-versa).
 */
export async function reconcileCampaignPayment(
  admin: Admin,
  campaign: Pick<Campaign, "id" | "created_at">
): Promise<ReconcileOutcome> {
  const outcome: ReconcileOutcome = { published: false, found: 0, pending: 0, errors: [] };

  if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
    try {
      const result = await getMercadoPagoPaymentClient().search({
        options: {
          external_reference: campaign.id,
          sort: "date_created",
          criteria: "desc",
          limit: 20,
        },
      });
      for (const payment of result.results ?? []) {
        outcome.found += 1;
        const synced = await processMercadoPagoPayment(admin, {
          id: payment.id,
          status: payment.status,
          external_reference: payment.external_reference ?? campaign.id,
          transaction_amount: payment.transaction_amount,
          metadata: payment.metadata,
        });
        if (synced.published) outcome.published = true;
        if (synced.paymentStatus === "pending") outcome.pending += 1;
      }
    } catch (err) {
      outcome.errors.push(`mercadopago: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      // O Stripe não filtra sessões por metadado: lista as criadas depois da
      // campanha e filtra aqui. O volume é pequeno.
      const createdAfter = Math.floor(new Date(campaign.created_at).getTime() / 1000);
      const sessions = getStripe().checkout.sessions.list({
        created: { gte: createdAfter },
        limit: 100,
      });
      let scanned = 0;
      for await (const session of sessions) {
        if (++scanned > MAX_STRIPE_SESSIONS_SCANNED) break;
        if (session.metadata?.campaignId !== campaign.id) continue;
        outcome.found += 1;
        const synced = await processStripeSession(admin, session);
        if (synced.published) outcome.published = true;
        if (synced.paymentStatus === "pending") outcome.pending += 1;
      }
    } catch (err) {
      outcome.errors.push(`stripe: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return outcome;
}
