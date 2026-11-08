"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { claimReferral, REFERRAL_COOKIE } from "@/lib/referral";

export interface AuthActionState {
  error: string | null;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(String(formData.get("redirectTo") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Veio pelo "Crie a sua" de uma campanha? Registra a indicação (nunca bloqueia o cadastro).
  if (data.user) {
    try {
      await claimReferral(createAdminClient(), {
        userId: data.user.id,
        userCreatedAt: data.user.created_at,
        slug: (await cookies()).get(REFERRAL_COOKIE)?.value,
      });
    } catch (err) {
      console.error("[signup] falha ao registrar a indicação", err);
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
