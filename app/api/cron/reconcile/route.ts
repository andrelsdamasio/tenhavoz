import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertAdminAboutProblems, releaseApprovedPayments } from "@/lib/payment-recovery";

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
    return NextResponse.json({ ok: true, ...released, ...alerts });
  } catch (err) {
    console.error("[cron] falha na conciliação automática", err);
    return NextResponse.json({ error: "Falha na conciliação." }, { status: 500 });
  }
}
