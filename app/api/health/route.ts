import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Saúde do site: responde 200 se o app e o banco estão de pé, 503 se não. */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("campaigns").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health] banco indisponível", err);
    return NextResponse.json({ ok: false, db: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
