import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, signState, SITE_URL } from "@/lib/mp-oauth";

/** Começa a conexão: leva a pessoa à página oficial do Mercado Pago para autorizar. */
export async function GET(request: Request) {
  const fromWizard = new URL(request.url).searchParams.get("next") === "nova";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login?next=/dashboard/doacoes`);

  try {
    const res = NextResponse.redirect(buildAuthUrl(signState(user.id)));
    if (fromWizard) res.cookies.set("mp_next", "nova", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 900, path: "/" });
    return res;
  } catch (err) {
    console.error("[mp-oauth] não configurado", err);
    return NextResponse.redirect(`${SITE_URL}/dashboard/doacoes?mp=indisponivel`);
  }
}
