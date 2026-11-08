import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, signState, SITE_URL } from "@/lib/mp-oauth";

/** Começa a conexão: leva a pessoa à página oficial do Mercado Pago para autorizar. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login?next=/dashboard/doacoes`);

  try {
    return NextResponse.redirect(buildAuthUrl(signState(user.id)));
  } catch (err) {
    console.error("[mp-oauth] não configurado", err);
    return NextResponse.redirect(`${SITE_URL}/dashboard/doacoes?mp=indisponivel`);
  }
}
