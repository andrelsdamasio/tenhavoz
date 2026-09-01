import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordEvent } from "@/lib/events";
import type { EventType } from "@/lib/types";

/**
 * Tracking mínimo de audiência: "view" quando a landing pública carrega,
 * "click" quando o botão mailto é clicado (ver components/ViewTracker.tsx e
 * components/TrackedMailtoLink.tsx). Chamado via navigator.sendBeacon, então
 * o corpo chega como texto (Blob), não necessariamente application/json.
 *
 * Sem CAPTCHA/rate-limit — aceitável para o volume esperado de uma landing
 * de manifesto, mas os números podem ser inflados por alguém insistindo em
 * chamar o endpoint direto. Documentado no README como limitação conhecida.
 */
export async function POST(request: Request) {
  let body: { campaignId?: string; type?: string };
  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { campaignId, type } = body;

  if (!campaignId || (type !== "view" && type !== "click")) {
    return NextResponse.json({ error: "campaignId/type inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("status", "published")
    .maybeSingle();

  if (!campaign) {
    // Campanha inexistente/não publicada — ignora silenciosamente, não é
    // erro do visitante.
    return NextResponse.json({ received: true });
  }

  await recordEvent(admin, campaignId, type as EventType);

  return NextResponse.json({ received: true });
}
