import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { fetchApprovedSitePayments, auditMercadoPagoPayments } from "@/lib/payment-audit";
import { processMercadoPagoPayment } from "@/lib/payment-sync";
import { adminEmails } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";

/** Só avisamos o admin depois deste tempo: dá chance ao webhook normal de agir. */
export const ALERT_AFTER_MS = 10 * 60 * 1000;

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Rede de segurança que não depende de webhook nem do cliente voltar ao site:
 * busca no Mercado Pago os pagamentos aprovados recentes e libera as páginas
 * cujas campanhas existem mas ainda não estão no ar. Idempotente.
 */
export async function releaseApprovedPayments(
  admin: SupabaseClient<Database>,
  days = 3
): Promise<{ checked: number; released: number }> {
  const { payments } = await fetchApprovedSitePayments(days);
  const refs = [
    ...new Set(payments.map((p) => p.external_reference).filter((r): r is string => !!r && UUID.test(r))),
  ];
  if (refs.length === 0) return { checked: 0, released: 0 };

  const pendingIds = new Set<string>();
  for (let i = 0; i < refs.length; i += 100) {
    const { data, error } = await admin
      .from("campaigns")
      .select("id, status")
      .in("id", refs.slice(i, i + 100))
      .neq("status", "published");
    if (error) throw error;
    for (const c of data ?? []) pendingIds.add(c.id);
  }

  let released = 0;
  for (const p of payments) {
    if (!p.external_reference || !pendingIds.has(p.external_reference)) continue;
    const result = await processMercadoPagoPayment(admin, p);
    if (result.published) {
      released += 1;
      console.log(`[cron] liberada a campanha ${result.campaignId} (pagamento ${p.id})`);
    }
  }
  return { checked: pendingIds.size, released };
}

/**
 * Avisa o admin por e-mail dos pagamentos aprovados que continuam sem página
 * (e que ele ainda não marcou como resolvidos), uma vez por pagamento.
 */
export async function alertAdminAboutProblems(
  admin: SupabaseClient<Database>,
  now = Date.now()
): Promise<{ alerted: number }> {
  const audit = await auditMercadoPagoPayments(admin, 7);
  const fresh = audit.rows.filter(
    (r) =>
      r.status !== "ok" &&
      !r.alerted &&
      r.createdAt &&
      now - new Date(r.createdAt).getTime() > ALERT_AFTER_MS
  );
  if (fresh.length === 0) return { alerted: 0 };

  const to = adminEmails();
  const lines = fresh.map(
    (r) =>
      `- Pagamento ${r.paymentId}: R$ ${r.amount.toFixed(2)} — ${r.accountEmail ?? r.payerEmail ?? "e-mail não identificado"} — ` +
      (r.status === "release"
        ? "pago, página não liberada (use 'Liberar agora' no admin)"
        : r.status === "campaign_deleted"
          ? "pago, mas a campanha foi apagada (gere cupom ou reembolse)"
          : "pago sem campanha identificada")
  );
  const sent =
    to.length > 0 &&
    (await sendEmail({
      to,
      subject: `TenhaVoz: ${fresh.length} pagamento(s) aprovado(s) sem página no ar`,
      text:
        `Os pagamentos abaixo foram aprovados no Mercado Pago mas não têm página no ar:\n\n` +
        `${lines.join("\n")}\n\nAbra /admin/reports para atender.`,
    }));

  if (!sent) {
    console.error("[cron] ATENÇÃO: pagamentos sem página no ar e alerta não enviado", lines);
    return { alerted: 0 };
  }

  await admin.from("payment_followups").upsert(
    fresh.map((r) => ({ provider_payment_id: r.paymentId, alerted_at: new Date().toISOString() })),
    { onConflict: "provider_payment_id" }
  );
  return { alerted: fresh.length };
}
