import type { createAdminClient } from "@/lib/supabase/admin";
import { untyped, type AdRow } from "@/lib/ad-orders";
import { sendEmail } from "@/lib/email";
import { emailShell } from "@/lib/email-template";
import { formatBRL } from "@/lib/pricing";
import { SITE_URL } from "@/lib/mp-oauth";

type Admin = ReturnType<typeof createAdminClient>;

/** O pagamento de anúncio usa external_reference "ad:<id>"; o de campanha usa só o id. */
export const AD_REF_PREFIX = "ad:";
export function adRef(id: string): string {
  return `${AD_REF_PREFIX}${id}`;
}
export function adIdFromRef(ref: string | undefined | null): string | null {
  if (!ref || !ref.startsWith(AD_REF_PREFIX)) return null;
  const id = ref.slice(AD_REF_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export interface AdPaymentLike {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
}

export interface AdSyncResult {
  adId: string | null;
  outcome: "approved" | "pending" | "failed" | "unknown";
}

/**
 * Confirma o pagamento de um anúncio consultando o que o Mercado Pago devolveu.
 * Só vale se o valor bate com o pedido; é idempotente (o mesmo aviso várias
 * vezes não manda e-mail repetido nem muda nada de novo).
 */
export async function processAdPayment(admin: Admin, payment: AdPaymentLike): Promise<AdSyncResult> {
  const adId = adIdFromRef(payment.external_reference);
  if (!adId || payment.id === undefined) return { adId: null, outcome: "unknown" };
  const db = untyped(admin);

  const { data } = await db.from("ads").select("*").eq("id", adId).maybeSingle();
  const ad = data as AdRow | null;
  if (!ad) {
    console.error("[anuncios] ATENÇÃO: pagamento de anúncio inexistente — verificar/reembolsar", { paymentId: payment.id, adId });
    return { adId, outcome: "unknown" };
  }

  const paidCents = Math.round((payment.transaction_amount ?? 0) * 100);
  if (payment.status === "approved") {
    if (paidCents !== ad.amount_cents) {
      console.error("[anuncios] valor pago diferente do pedido", { adId, paidCents, expected: ad.amount_cents });
      return { adId, outcome: "unknown" };
    }
    const { data: changed } = await db
      .from("ads")
      .update({ status: "in_review", mp_payment_id: String(payment.id), paid_at: new Date().toISOString() })
      .eq("id", adId)
      .eq("status", "awaiting_payment")
      .select("id");
    if (changed && changed.length > 0) await notifyAdPaid(ad);
    return { adId, outcome: "approved" };
  }
  if (payment.status === "refunded" || payment.status === "charged_back") {
    await db.from("ads").update({ status: "refunded" }).eq("id", adId).neq("status", "refunded");
    return { adId, outcome: "failed" };
  }
  if (payment.status === "rejected" || payment.status === "cancelled") return { adId, outcome: "failed" };
  return { adId, outcome: "pending" };
}

function orderUrl(id: string): string {
  return `${SITE_URL}/anuncie/pedido/${id}`;
}

async function notifyAdPaid(ad: AdRow): Promise<void> {
  try {
    const html = emailShell({
      siteUrl: SITE_URL,
      heading: "Recebemos o pagamento do seu anúncio",
      intro: "Obrigado! Antes de ir ao ar, a gente confere o anúncio (texto, link e imagem). Isso costuma levar até 1 dia útil. Se algo não puder ser publicado, devolvemos o valor integral.",
      rows: [
        { label: "Anúncio", value: ad.title },
        { label: "Período", value: `${ad.duration_days} dias` },
        { label: "Valor", value: formatBRL(ad.amount_cents), strong: true },
      ],
      cta: { label: "Acompanhar meu pedido", url: orderUrl(ad.id) },
    });
    await sendEmail({
      to: ad.contact_email,
      subject: "Recebemos o pagamento do seu anúncio no TenhaVoz",
      text: `Recebemos o pagamento do seu anúncio "${ad.title}". Vamos conferir e colocar no ar em até 1 dia útil. Acompanhe: ${orderUrl(ad.id)}`,
      html,
    });
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (admins.length > 0) {
      await sendEmail({
        to: admins,
        subject: `Anúncio pago para aprovar: ${ad.title}`,
        text: `${ad.advertiser} pagou ${formatBRL(ad.amount_cents)} por ${ad.duration_days} dias. Aprove em ${SITE_URL}/admin/anuncios`,
      });
    }
  } catch (err) {
    console.error("[anuncios] falha ao enviar e-mails do pagamento", err);
  }
}

export async function notifyAdLive(ad: AdRow, endsAt: Date): Promise<void> {
  const html = emailShell({
    siteUrl: SITE_URL,
    heading: "Seu anúncio está no ar",
    intro: "Aprovamos o seu anúncio e ele já aparece nas páginas do TenhaVoz.",
    rows: [
      { label: "Anúncio", value: ad.title },
      { label: "No ar até", value: endsAt.toLocaleDateString("pt-BR") },
    ],
    cta: { label: "Ver meu pedido", url: orderUrl(ad.id) },
  });
  await sendEmail({
    to: ad.contact_email,
    subject: "Seu anúncio está no ar no TenhaVoz",
    text: `Seu anúncio "${ad.title}" está no ar até ${endsAt.toLocaleDateString("pt-BR")}.`,
    html,
  });
}

export async function notifyAdRejected(ad: AdRow, reason: string, refunded: boolean): Promise<void> {
  const html = emailShell({
    siteUrl: SITE_URL,
    heading: "Não conseguimos publicar o seu anúncio",
    intro: `${reason} ${refunded ? "O valor foi devolvido integralmente pelo mesmo meio de pagamento." : "Vamos devolver o valor integralmente; se não aparecer em alguns dias, responda este e-mail."}`,
  });
  await sendEmail({
    to: ad.contact_email,
    subject: "Sobre o seu anúncio no TenhaVoz",
    text: `Não conseguimos publicar o anúncio "${ad.title}". ${reason} ${refunded ? "O valor foi devolvido." : "Vamos devolver o valor."}`,
    html,
  });
}

/** Devolve o valor pelo Mercado Pago da plataforma. */
export async function refundAdPayment(paymentId: string): Promise<boolean> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || !/^\d{1,20}$/.test(paymentId)) return false;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `ad-refund-${paymentId}` },
      body: "{}",
    });
    if (!res.ok) console.error("[anuncios] reembolso recusado", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[anuncios] falha ao reembolsar", err);
    return false;
  }
}

/** Procura no Mercado Pago pagamentos deste anúncio (volta do cartão, webhook atrasado). */
export async function reconcileAdPayment(admin: Admin, adId: string): Promise<void> {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return;
  try {
    const { getMercadoPagoPaymentClient } = await import("@/lib/mercadopago");
    const result = await getMercadoPagoPaymentClient().search({
      options: { external_reference: adRef(adId), sort: "date_created", criteria: "desc", limit: 10 },
    });
    for (const p of result.results ?? []) {
      await processAdPayment(admin, { id: p.id, status: p.status, external_reference: p.external_reference, transaction_amount: p.transaction_amount });
    }
  } catch (err) {
    console.error("[anuncios] falha ao conferir pagamentos do anúncio", err);
  }
}
