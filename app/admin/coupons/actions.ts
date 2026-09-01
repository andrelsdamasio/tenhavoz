"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { normalizeCouponCode } from "@/lib/coupons";
import type { CouponDiscountType } from "@/lib/types";

export interface CreateCouponState {
  error: string | null;
  success: boolean;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }
}

export async function createCouponAction(
  _prevState: CreateCouponState,
  formData: FormData
): Promise<CreateCouponState> {
  await requireAdmin();

  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const discountType = String(formData.get("discountType") ?? "") as CouponDiscountType;
  const discountValue = Number(formData.get("discountValue"));
  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!code) {
    return { error: "Informe um código pro cupom.", success: false };
  }

  if (discountType !== "percent" && discountType !== "fixed") {
    return { error: "Tipo de desconto inválido.", success: false };
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "Valor do desconto inválido.", success: false };
  }

  if (discountType === "percent" && discountValue > 100) {
    return { error: "Desconto percentual não pode passar de 100%.", success: false };
  }

  const maxRedemptions = maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null;
  if (maxRedemptions !== null && (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0)) {
    return { error: "Limite de usos inválido.", success: false };
  }

  // "fixed" é digitado em reais no formulário (ex.: 10,50); guardamos em
  // centavos, mesma unidade dos preços por prazo (price_72h/7d_brl_cents).
  const discountValueStored =
    discountType === "fixed" ? Math.round(discountValue * 100) : Math.round(discountValue);

  const admin = createAdminClient();

  const { error } = await admin.from("coupons").insert({
    code,
    discount_type: discountType,
    discount_value: discountValueStored,
    max_redemptions: maxRedemptions,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "Já existe um cupom com esse código." : error.message,
      success: false,
    };
  }

  revalidatePath("/admin/coupons");
  return { error: null, success: true };
}

export async function toggleCouponActiveAction(formData: FormData) {
  await requireAdmin();

  const couponId = String(formData.get("couponId") ?? "");
  const nextActive = formData.get("nextActive") === "true";

  const admin = createAdminClient();
  await admin.from("coupons").update({ active: nextActive }).eq("id", couponId);

  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();

  const couponId = String(formData.get("couponId") ?? "");

  const admin = createAdminClient();
  await admin.from("coupons").delete().eq("id", couponId);

  revalidatePath("/admin/coupons");
}
