import { createAdminClient } from "@/lib/supabase/admin";
import { getSellerAccessToken, SITE_URL } from "@/lib/mp-oauth";
import { judgePayment, payerEmail } from "@/lib/donations";
import { sendEmail } from "@/lib/email";
import { creatorNoticeEmail, donorReceiptEmail } from "@/lib/donation-emails";

type Admin = ReturnType<typeof createAdminClient>;

async function notifyApproved(
  admin: Admin,
  donation: {
    id?: string;
    payment_id?: string | null;
    fundraiser_id: string;
    amount_cents: number;
    tip_cents: number;
    donor_name: string | null;
    donor_email: string | null;
    is_anonymous: boolean;
    message: string | null;
  },
  creatorId: string
) {
  try {
    const { data: f } = await admin.from("fundraisers").select("title, slug, goal_cents").eq("id", donation.fundraiser_id).maybeSingle();
    if (!f) return;
    const { data: sums } = await admin
      .from("fundraiser_donations")
      .select("amount_cents")
      .eq("fundraiser_id", donation.fundraiser_id)
      .eq("status", "approved");
    const raisedCents = (sums ?? []).reduce((t, r) => t + (r as { amount_cents: number }).amount_cents, 0);
    const base = { title: f.title, slug: f.slug, amountCents: donation.amount_cents, siteUrl: SITE_URL };
    const donorName = donation.is_anonymous ? "Anônimo" : donation.donor_name?.trim() || "Anônimo";

    const { data: userRes } = await admin.auth.admin.getUserById(creatorId);
    const creatorEmail = userRes?.user?.email;
    if (creatorEmail) {
      const n = creatorNoticeEmail({ ...base, donorName, message: donation.message, raisedCents, goalCents: f.goal_cents });
      await sendEmail({ to: creatorEmail, ...n });
    }
    if (donation.donor_email) {
      const r = donorReceiptEmail({
        ...base,
        donorName: donation.donor_name?.trim() || "doador(a)",
        tipCents: donation.tip_cents,
        receiptCode: donation.id ? donation.id.slice(0, 8).toUpperCase() : undefined,
        paymentId: donation.payment_id ?? undefined,
        paidAt: new Date(),
      });
      await sendEmail({ to: donation.donor_email, ...r });
    }
  } catch (err) {
    console.error("[mp-donations] falha ao enviar e-mails", err);
  }
}

export type DonationSync = "approved" | "pending" | "failed" | "unknown" | "retry";

/**
 * Consulta o pagamento no Mercado Pago (com o token do criador) e atualiza a
 * doação. Serve ao webhook e à tela de Pix. O aviso nunca é confiado: só o
 * pagamento que buscamos conta. Idempotente.
 */
export async function syncDonationPayment(admin: Admin, donationId: string, paymentId: string): Promise<DonationSync> {
  if (!/^[0-9a-f-]{36}$/i.test(donationId) || !/^\d{1,20}$/.test(paymentId)) return "unknown";
  const { data: donation } = await admin
    .from("fundraiser_donations")
    .select("id, fundraiser_id, status, amount_cents, tip_cents, donor_name, donor_email, is_anonymous, message")
    .eq("id", donationId)
    .maybeSingle();
  if (!donation) return "unknown";

  const { data: fundraiser } = await admin.from("fundraisers").select("user_id").eq("id", donation.fundraiser_id).maybeSingle();
  if (!fundraiser) return "unknown";

  const token = await getSellerAccessToken(admin, fundraiser.user_id);
  if (!token) {
    console.error(`[mp-donations] sem token do criador para a doação ${donationId}`);
    return "retry"; // o Mercado Pago tenta de novo
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return "unknown";
  if (!res.ok) return "retry";

  const payment = await res.json();
  const verdict = judgePayment(payment, donation);
  if (verdict.kind === "reject") {
    console.error(`[mp-donations] pagamento ${paymentId} recusado: ${verdict.reason}`);
    return "unknown";
  }
  if (verdict.kind === "pending") return "pending";

  if (verdict.kind === "approved") {
    // só muda se ainda não estava aprovada (idempotente)
    const { data: changed } = await admin
      .from("fundraiser_donations")
      .update({ status: "approved", provider_payment_id: paymentId, approved_at: new Date().toISOString(), donor_email: donation.donor_email ?? payerEmail(payment) })
      .eq("id", donation.id)
      .neq("status", "approved")
      .select("id");
    // e-mails só na primeira aprovação (avisos repetidos não reenviam)
    if (changed && changed.length > 0) await notifyApproved(admin, { ...donation, payment_id: paymentId, donor_email: donation.donor_email ?? payerEmail(payment) }, fundraiser.user_id);
  } else {
    await admin
      .from("fundraiser_donations")
      .update({ status: verdict.kind, provider_payment_id: paymentId })
      .eq("id", donation.id)
      .neq("status", verdict.kind);
    return "failed";
  }
  return "approved";
}
