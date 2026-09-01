import type { SupabaseClient } from "@supabase/supabase-js";
import type { Coupon, Database } from "@/lib/types";

/**
 * Piso mínimo para cobranças parcialmente descontadas — evita tentar cobrar
 * um valor residual de poucos centavos que o Stripe/Mercado Pago podem
 * rejeitar. Não se aplica quando o desconto zera o preço: um cupom de 100%
 * (ou de valor fixo maior que o preço) deve resultar em campanha gratuita,
 * não em R$1.
 */
const MIN_PRICE_CENTS = 100;

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Busca um cupom utilizável agora (ativo, dentro da validade, com saldo de
 * usos). Usada tanto na pré-visualização do desconto no checkout quanto na
 * revalidação server-side antes de criar a sessão de pagamento — nunca
 * confiamos no desconto calculado no cliente.
 */
export async function findUsableCoupon(
  admin: SupabaseClient<Database>,
  rawCode: string
): Promise<Coupon | null> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.max_redemptions !== null && data.redemption_count >= data.max_redemptions) {
    return null;
  }

  return data;
}

export function applyCouponDiscount(priceCents: number, coupon: Coupon): number {
  const discounted =
    coupon.discount_type === "percent"
      ? Math.round(priceCents * (1 - coupon.discount_value / 100))
      : priceCents - coupon.discount_value;

  if (discounted <= 0) return 0;
  return Math.max(MIN_PRICE_CENTS, discounted);
}

/**
 * Incrementa o contador de uso do cupom. Só deve ser chamada quando um
 * pagamento é confirmado E a campanha está sendo publicada pela primeira
 * vez (ver publishCampaignAfterConfirmedPayment) — assim um reenvio de
 * webhook (retry do Stripe/Mercado Pago) nunca conta o mesmo cupom duas
 * vezes.
 */
export async function redeemCoupon(
  admin: SupabaseClient<Database>,
  rawCode: string
): Promise<void> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return;

  const { data } = await admin
    .from("coupons")
    .select("redemption_count")
    .eq("code", code)
    .maybeSingle();

  if (!data) return;

  await admin
    .from("coupons")
    .update({ redemption_count: data.redemption_count + 1 })
    .eq("code", code);
}

export async function listCoupons(admin: SupabaseClient<Database>): Promise<Coupon[]> {
  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
