"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { sendEmail } from "@/lib/email";
import { recoveryEmail, welcomeEmail } from "@/lib/auth-emails";
import { SITE_URL } from "@/lib/mp-oauth";
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

  // Boas-vindas com a marca. Nunca bloqueia o cadastro.
  const welcome = welcomeEmail({ siteUrl: SITE_URL });
  void sendEmail({ to: email, ...welcome }).catch(() => false);

  redirect("/dashboard");
}

/**
 * Pede a troca de senha. O e-mail sai pelo nosso remetente (Resend), com a marca do TenhaVoz.
 * A resposta é sempre a mesma, exista ou não a conta, para não revelar quem tem cadastro.
 */
export async function requestPasswordReset(
  _prevState: AuthActionState & { sent?: boolean },
  formData: FormData
): Promise<AuthActionState & { sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Informe um e-mail válido.", sent: false };
  }

  try {
    const { data } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
    const hash = data?.properties?.hashed_token;
    if (hash) {
      const link = `${SITE_URL}/auth/confirmar?token_hash=${encodeURIComponent(hash)}&type=recovery`;
      await sendEmail({ to: email, ...recoveryEmail({ siteUrl: SITE_URL, link }) });
    }
  } catch (err) {
    console.error("[auth] falha ao gerar o link de recuperação", err);
  }
  return { error: null, sent: true };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "O link expirou. Peça um novo em “Esqueci minha senha”." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
