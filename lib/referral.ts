import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendEmail } from "@/lib/email";

/** Desconto do cupom que o indicador ganha (em %). Mude aqui para mudar a recompensa. */
export const REFERRAL_DISCOUNT_PERCENT = 20;
/** Validade do cupom de indicação. */
export const REFERRAL_COUPON_DAYS = 90;
/** Cookie que guarda a campanha de origem entre a visita e o cadastro. */
export const REFERRAL_COOKIE = "tv_ref";
/** Só contas criadas há pouco podem ser "indicadas" (quem já tinha conta não vale). */
export const NEW_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function isValidRefSlug(value: string | null | undefined): value is string {
  return !!value && SLUG_RE.test(value);
}

type Admin = SupabaseClient<Database>;

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tenhavoz.com.br").replace(/\/$/, "");
}

/**
 * Liga uma conta recém-criada ao dono da campanha de origem. Ignora (sem erro)
 * slug inválido, campanha inexistente/não publicada, auto-indicação, conta
 * antiga e indicado já registrado.
 */
export async function claimReferral(
  admin: Admin,
  input: { userId: string; userCreatedAt: string | undefined; slug: string | null | undefined; now?: number }
): Promise<"claimed" | "ignored"> {
  const now = input.now ?? Date.now();
  if (!isValidRefSlug(input.slug)) return "ignored";
  if (!input.userCreatedAt || now - new Date(input.userCreatedAt).getTime() > NEW_ACCOUNT_WINDOW_MS) {
    return "ignored";
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .select("user_id")
    .eq("slug", input.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!campaign || campaign.user_id === input.userId) return "ignored";

  const { error } = await admin.from("referrals").upsert(
    { referred_user_id: input.userId, referrer_user_id: campaign.user_id, slug: input.slug },
    { onConflict: "referred_user_id", ignoreDuplicates: true }
  );
  if (error) throw error;
  return "claimed";
}

/**
 * Chamado quando uma campanha é publicada pela primeira vez após um pagamento
 * de verdade. Se o dono veio por indicação e ainda não rendeu recompensa,
 * gera o cupom do indicador. A "reserva" (rewarded_at) é feita antes, numa
 * atualização condicional, para dois processamentos simultâneos não gerarem
 * dois cupons.
 */
export async function rewardReferrerIfAny(
  admin: Admin,
  referredUserId: string,
  paidAmount: number
): Promise<{ code: string } | null> {
  if (!(paidAmount > 0)) return null;

  const { data: claimed } = await admin
    .from("referrals")
    .update({ rewarded_at: new Date().toISOString() })
    .eq("referred_user_id", referredUserId)
    .is("rewarded_at", null)
    .select("referrer_user_id")
    .maybeSingle();
  if (!claimed) return null;

  const code = `INDICA-${randomBytes(4).toString("hex").toUpperCase()}`;
  const expires = new Date(Date.now() + REFERRAL_COUPON_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("coupons").insert({
    code,
    discount_type: "percent",
    discount_value: REFERRAL_DISCOUNT_PERCENT,
    max_redemptions: 1,
    active: true,
    expires_at: expires,
  });
  if (error) {
    // Desfaz a reserva para a próxima tentativa.
    await admin.from("referrals").update({ rewarded_at: null }).eq("referred_user_id", referredUserId);
    throw error;
  }

  await admin.from("referrals").update({ coupon_code: code }).eq("referred_user_id", referredUserId);

  try {
    const { data } = await admin.auth.admin.getUserById(claimed.referrer_user_id);
    const email = data.user?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: `Você ganhou ${REFERRAL_DISCOUNT_PERCENT}% de desconto no TenhaVoz`,
        text:
          `Alguém criou uma campanha no TenhaVoz a partir da sua página. Obrigado pela indicação!\\n\\n` +
          `Seu cupom de ${REFERRAL_DISCOUNT_PERCENT}% de desconto: ${code}\\n` +
          `Use no pagamento da sua próxima campanha (vale por ${REFERRAL_COUPON_DAYS} dias, uso único): ${siteBase()}/dashboard\\n\\n` +
          `Equipe TenhaVoz`,
      });
    }
  } catch (err) {
    console.error("[referral] cupom criado, mas falhou o e-mail ao indicador", err);
  }

  return { code };
}

export interface ReferralSummary {
  invited: number;
  rewarded: number;
  /** Cupons ganhos que ainda podem ser usados. */
  availableCoupons: string[];
}

/** Resumo para o painel de quem indica. */
export async function getReferralSummary(admin: Admin, userId: string): Promise<ReferralSummary> {
  const { data } = await admin
    .from("referrals")
    .select("rewarded_at, coupon_code")
    .eq("referrer_user_id", userId);
  const rows = data ?? [];

  const codes = rows.map((r) => r.coupon_code).filter((c): c is string => !!c);
  let available: string[] = [];
  if (codes.length > 0) {
    const { data: coupons } = await admin
      .from("coupons")
      .select("code, active, redemption_count, max_redemptions, expires_at")
      .in("code", codes);
    available = (coupons ?? [])
      .filter(
        (c) =>
          c.active &&
          (c.max_redemptions === null || c.redemption_count < c.max_redemptions) &&
          (!c.expires_at || new Date(c.expires_at) > new Date())
      )
      .map((c) => c.code);
  }

  return {
    invited: rows.length,
    rewarded: rows.filter((r) => r.rewarded_at).length,
    availableCoupons: available,
  };
}
