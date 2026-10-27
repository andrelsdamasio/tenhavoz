import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { getMercadoPagoPaymentClient } from "@/lib/mercadopago";

/**
 * Conciliação: compara o que o Mercado Pago diz que foi PAGO com o que existe
 * no nosso banco. Existe porque o dinheiro pode entrar sem a página sair
 * (webhook que não chegou, campanha apagada pelo cliente...) e, antes, isso
 * não aparecia em lugar nenhum do painel.
 */

export type AuditStatus =
  | "ok" // campanha existe e está no ar
  | "release" // pago, campanha existe mas não está no ar → dá para liberar
  | "campaign_deleted" // pago, mas a campanha foi apagada → reembolsar/atender
  | "no_reference"; // pago fora do checkout do site (sem campanha ligada)

export interface AuditRow {
  paymentId: string;
  status: AuditStatus;
  amount: number;
  createdAt: string;
  payerEmail: string | null;
  campaignId: string | null;
  campaignTitle: string | null;
}

export interface AuditResult {
  rows: AuditRow[];
  /** Pagamentos da conta que NÃO vieram do TenhaVoz (outros usos da conta). */
  ignored: number;
  /** Mensagem se o Mercado Pago não pôde ser consultado. */
  error: string | null;
}

const PAGE = 100;
const MAX_PAGES = 5;

interface MpPaymentLite {
  id?: string | number;
  external_reference?: string;
  transaction_amount?: number;
  date_created?: string;
  payer?: { email?: string };
  description?: string;
  notification_url?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * A conta do Mercado Pago pode receber pagamentos que nada têm a ver com o
 * TenhaVoz. Só entra na conciliação o que veio do nosso checkout: tem
 * external_reference de campanha, ou aponta para o nosso webhook, ou leva o
 * título que usamos no item.
 */
export function isFromSite(p: MpPaymentLite): boolean {
  return (
    UUID.test(p.external_reference ?? "") ||
    (p.notification_url ?? "").includes("/api/webhooks/mercadopago") ||
    (p.description ?? "").includes("TenhaVoz")
  );
}

export function classify(
  payment: MpPaymentLite,
  campaigns: Map<string, { title: string; status: string }>
): AuditRow {
  const ref = payment.external_reference || null;
  const campaign = ref ? campaigns.get(ref) : undefined;
  let status: AuditStatus;
  if (!ref) status = "no_reference";
  else if (!campaign) status = "campaign_deleted";
  else if (campaign.status === "published") status = "ok";
  else status = "release";

  return {
    paymentId: String(payment.id),
    status,
    amount: payment.transaction_amount ?? 0,
    createdAt: payment.date_created ?? "",
    payerEmail: payment.payer?.email ?? null,
    campaignId: ref,
    campaignTitle: campaign?.title ?? null,
  };
}

export async function auditMercadoPagoPayments(
  admin: SupabaseClient<Database>,
  days = 30
): Promise<AuditResult> {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return { rows: [], ignored: 0, error: "MERCADOPAGO_ACCESS_TOKEN não configurada." };
  }

  try {
    const all: MpPaymentLite[] = [];
    const client = getMercadoPagoPaymentClient();
    for (let i = 0; i < MAX_PAGES; i += 1) {
      const result = await client.search({
        options: {
          status: "approved",
          range: "date_created",
          begin_date: `NOW-${days}DAYS`,
          end_date: "NOW",
          sort: "date_created",
          criteria: "desc",
          limit: PAGE,
          offset: i * PAGE,
        },
      });
      const batch = (result.results ?? []) as MpPaymentLite[];
      all.push(...batch);
      if (batch.length < PAGE) break;
    }

    const payments = all.filter(isFromSite);
    const ignored = all.length - payments.length;
    const refs = [...new Set(payments.map((p) => p.external_reference).filter(Boolean))] as string[];
    const campaigns = new Map<string, { title: string; status: string }>();
    // Só ids com formato de uuid vão ao banco; qualquer outra coisa é "sem campanha".
    const uuidRefs = refs.filter((r) => UUID.test(r));
    for (let i = 0; i < uuidRefs.length; i += 100) {
      const { data, error } = await admin
        .from("campaigns")
        .select("id, title, status")
        .in("id", uuidRefs.slice(i, i + 100));
      if (error) throw error;
      for (const c of data ?? []) campaigns.set(c.id, { title: c.title, status: c.status });
    }

    const rows = payments.map((p) =>
      classify(
        { ...p, external_reference: p.external_reference && UUID.test(p.external_reference) ? p.external_reference : undefined },
        campaigns
      )
    );
    return { rows, ignored, error: null };
  } catch (err) {
    console.error("[payment-audit] falha ao consultar o Mercado Pago", err);
    return { rows: [], ignored: 0, error: "Não foi possível consultar o Mercado Pago agora." };
  }
}
