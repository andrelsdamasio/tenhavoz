import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimReferral, REFERRAL_COOKIE } from "@/lib/referral";

/**
 * Callback do OAuth (login com Google). O Supabase redireciona pra cá com
 * ?code=... depois que o usuário aprova na tela do Google; trocamos o code
 * pela sessão e mandamos pro dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Conta nova pelo Google vinda de "Crie a sua"? Registra a indicação.
      // claimReferral ignora contas antigas, então quem só está entrando não conta.
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await claimReferral(createAdminClient(), {
            userId: user.id,
            userCreatedAt: user.created_at,
            slug: (await cookies()).get(REFERRAL_COOKIE)?.value,
          });
        }
      } catch (err) {
        console.error("[auth-callback] falha ao registrar a indicação", err);
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
