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
  | "no_reference"; // pago pelo site, mas sem campanha identificável

export interface AuditRow {
  paymentId: string;
  status: AuditStatus;
  amount: number;
  createdAt: string;
  payerEmail: string | null;
  /** E-mail da conta do TenhaVoz que pagou (a fonte confiável). */
  accountEmail: string | null;
  campaignId: string | null;
  campaignTitle: string | null;
  /** Já avisamos o admin por e-mail sobre este pagamento. */
  alerted: boolean;
}

export interface AuditResult {
  rows: AuditRow[];
  /** Pagamentos da conta que NÃO vieram do TenhaVoz (outros usos da conta). */
  ignored: number;
  /** Casos já marcados como resolvidos pelo admin (não entram em rows). */
  resolved: number;
  /** Mensagem se o Mercado Pago não pôde ser consultado. */
  error: string | null;
}

const PAGE = 100;
const MAX_PAGES = 5;
const UUID = /^[0-9a-f-]{36}$/i;

export interface MpPaymentLite {
  id?: string | number;
  external_reference?: string;
  transaction_amount?: number;
  date_created?: string;
  payer?: { email?: string };
  metadata?: Record<string, unknown>;
  description?: string;
  notification_url?: string;
  status?: string;
}

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
  campaigns: Map<string, { title: string; status: string }>,
  accountEmail: string | null = null
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
    accountEmail,
    campaignId: ref,
    campaignTitle: campaign?.title ?? null,
    alerted: false,
  };
}

/** Pagamentos aprovados dos últimos `days` dias que vieram do TenhaVoz. */
export async function fetchApprovedSitePayments(
  days: number
): Promise<{ payments: MpPaymentLite[]; ignored: number }> {
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
  return { payments, ignored: all.length - payments.length };
}

export async function auditMercadoPagoPayments(
  admin: SupabaseClient<Database>,
  days = 30
): Promise<AuditResult> {
  const empty = { rows: [], ignored: 0, resolved: 0 };
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return { ...empty, error: "MERCADOPAGO_ACCESS_TOKEN não configurada." };
  }

  try {
    const { payments, ignored } = await fetchApprovedSitePayments(days);

    const refs = [...new Set(payments.map((p) => p.external_reference).filter(Boolean))] as string[];
    const campaigns = new Map<string, { title: string; status: string }>();
    const owners = new Map<string, string>();
    // Só ids com formato de uuid vão ao banco; qualquer outra coisa é "sem campanha".
    const uuidRefs = refs.filter((r) => UUID.test(r));
    for (let i = 0; i < uuidRefs.length; i += 100) {
      const { data, error } = await admin
        .from("campaigns")
        .select("id, title, status, user_id")
        .in("id", uuidRefs.slice(i, i + 100));
      if (error) throw error;
      for (const c of data ?? []) {
        campaigns.set(c.id, { title: c.title, status: c.status });
        owners.set(c.id, c.user_id);
      }
    }

    const followups = new Map<string, { alerted: boolean; resolved: boolean }>();
    const ids = payments.map((p) => String(p.id));
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await admin
        .from("payment_followups")
        .select("provider_payment_id, alerted_at, resolved_at")
        .in("provider_payment_id", ids.slice(i, i + 100));
      for (const f of data ?? []) {
        followups.set(f.provider_payment_id, {
          alerted: !!f.alerted_at,
          resolved: !!f.resolved_at,
        });
      }
    }

    const emailCache = new Map<string, string | null>();
    async function emailOf(userId: string | undefined): Promise<string | null> {
      if (!userId) return null;
      if (!emailCache.has(userId)) {
        const { data } = await admin.auth.admin.getUserById(userId);
        emailCache.set(userId, data.user?.email ?? null);
      }
      return emailCache.get(userId) ?? null;
    }

    const rows: AuditRow[] = [];
    let resolved = 0;
    for (const p of payments) {
      const ref = p.external_reference && UUID.test(p.external_reference) ? p.external_reference : undefined;
      const row = classify({ ...p, external_reference: ref }, campaigns);
      const follow = followups.get(row.paymentId);
      row.alerted = !!follow?.alerted;
      if (row.status !== "ok") {
        if (follow?.resolved) {
          resolved += 1;
          continue;
        }
        const metaUser = typeof p.metadata?.user_id === "string" ? p.metadata.user_id : undefined;
        const metaEmail =
          typeof p.metadata?.user_email === "string" && p.metadata.user_email
            ? p.metadata.user_email
            : null;
        row.accountEmail =
          (await emailOf(ref ? owners.get(ref) : undefined)) ?? metaEmail ?? (await emailOf(metaUser));
      }
      rows.push(row);
    }
    return { rows, ignored, resolved, error: null };
  } catch (err) {
    console.error("[payment-audit] falha ao consultar o Mercado Pago", err);
    return { ...empty, error: "Não foi possível consultar o Mercado Pago agora." };
  }
}
