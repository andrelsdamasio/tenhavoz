import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCode, saveConnection, SITE_URL, verifyState } from "@/lib/mp-oauth";

/** Volta do Mercado Pago: confere o `state`, troca o código pelos tokens e guarda a conexão. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const toWizard = request.headers.get("cookie")?.includes("mp_next=nova") ?? false;
  const back = (flag: string) => {
    const res = NextResponse.redirect(`${SITE_URL}/dashboard/doacoes${toWizard ? "/new" : ""}?mp=${flag}`);
    if (toWizard) res.cookies.set("mp_next", "", { maxAge: 0, path: "/" });
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login?next=/dashboard/doacoes`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) return back("cancelado");

  try {
    if (!verifyState(state, user.id)) return back("invalido");
    const tokens = await exchangeCode(code);
    await saveConnection(createAdminClient(), user.id, tokens);
    return back("conectado");
  } catch (err) {
    console.error("[mp-oauth] falha ao conectar", err);
    return back("erro");
  }
}
