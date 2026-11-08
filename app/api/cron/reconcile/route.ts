import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyExpiringCampaigns } from "@/lib/expiry-notice";
import {
  alertAdminAboutProblems,
  notifyCustomersAboutDelay,
  releaseApprovedPayments,
} from "@/lib/payment-recovery";

export const dynamic = "force-dynamic";

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * Rotina agendada (a cada poucos minutos): libera pagamentos aprovados que o
 * webhook perdeu e avisa o admin dos que não têm solução automática.
 * Protegida por CRON_SECRET (Authorization: Bearer ...).
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[cron] CRON_SECRET não configurada na Vercel.");
    return NextResponse.json({ error: "CRON_SECRET ausente." }, { status: 500 });
  }
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const released = await releaseApprovedPayments(admin);
    const alerts = await alertAdminAboutProblems(admin);
    const customers = await notifyCustomersAboutDelay(admin);
    // Aviso de expiração é secundário: se falhar, não derruba a conciliação de pagamentos.
    const expiring = await notifyExpiringCampaigns(admin).catch((err) => {
      console.error("[cron] falha no aviso de expiração", err);
      return { notified: 0 };
    });
    return NextResponse.json({
      ok: true,
      ...released,
      ...alerts,
      ...customers,
      expiringNotified: expiring.notified,
    });
  } catch (err) {
    console.error("[cron] falha na conciliação automática", err);
    return NextResponse.json({ error: "Falha na conciliação." }, { status: 500 });
  }
}
