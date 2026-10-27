"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { updateAppSettings } from "@/lib/settings";
import { isValidHexColor } from "@/lib/color";
import { syncMercadoPagoPaymentById } from "@/lib/payment-sync";
import type { TemplateId } from "@/lib/types";

export interface UpdateSettingsState {
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

export async function updateSettingsAction(
  _prevState: UpdateSettingsState,
  formData: FormData
): Promise<UpdateSettingsState> {
  await requireAdmin();

  const price72hReais = Number(formData.get("price72hReais"));
  const price7dReais = Number(formData.get("price7dReais"));
  const enabledTemplates = formData
    .getAll("enabledTemplates")
    .map((value) => Number(value)) as TemplateId[];
  const manifestCharLimit = Number(formData.get("manifestCharLimit"));
  const manifestCharLimitEnabled = formData.get("manifestCharLimitEnabled") === "on";
  const templateColorPalette = formData.getAll("paletteColor").map((value) => String(value));

  if (!Number.isFinite(price72hReais) || price72hReais <= 0) {
    return { error: "Preço do plano de 72h inválido.", success: false };
  }

  if (!Number.isFinite(price7dReais) || price7dReais <= 0) {
    return { error: "Preço do plano de 7 dias inválido.", success: false };
  }

  if (enabledTemplates.length === 0) {
    return { error: "Selecione ao menos um template.", success: false };
  }

  if (!Number.isFinite(manifestCharLimit) || manifestCharLimit <= 0) {
    return { error: "Limite de caracteres inválido.", success: false };
  }

  if (templateColorPalette.length === 0) {
    return { error: "Adicione ao menos uma cor na paleta.", success: false };
  }

  if (!templateColorPalette.every(isValidHexColor)) {
    return { error: "Uma das cores da paleta é inválida.", success: false };
  }

  const admin = createAdminClient();

  await updateAppSettings(admin, {
    price72hBrlCents: Math.round(price72hReais * 100),
    price7dBrlCents: Math.round(price7dReais * 100),
    enabledTemplates,
    manifestCharLimit: Math.round(manifestCharLimit),
    manifestCharLimitEnabled,
    templateColorPalette,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/new");
  revalidatePath("/dashboard/checkout");

  return { error: null, success: true };
}

/** Libera na hora a página de um pagamento aprovado que não foi processado. */
export async function releasePaymentAction(formData: FormData) {
  await requireAdmin();

  const paymentId = String(formData.get("paymentId") ?? "");
  try {
    await syncMercadoPagoPaymentById(createAdminClient(), paymentId);
  } catch (err) {
    console.error("[admin] falha ao liberar pagamento", { paymentId, err });
  }

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

/**
 * Para quem pagou mas teve a campanha apagada (os dados se foram): gera um
 * cupom de 100% de uso único. O cliente refaz a página sem pagar de novo e
 * o admin devolve o código para ele. Se preferir devolver o dinheiro, o
 * reembolso é feito no painel do Mercado Pago.
 */
export async function issueCompensationCouponAction(formData: FormData) {
  await requireAdmin();

  const paymentId = String(formData.get("paymentId") ?? "").replace(/\D/g, "");
  const code = `PAGO-${randomBytes(4).toString("hex").toUpperCase()}`;

  const { error } = await createAdminClient().from("coupons").insert({
    code,
    discount_type: "percent",
    discount_value: 100,
    max_redemptions: 1,
    active: true,
  });

  if (error) {
    console.error("[admin] falha ao gerar cupom de compensação", { paymentId, error });
    redirect("/admin/reports?cupom=erro");
  }

  console.log(`[admin] cupom de compensação ${code} gerado para o pagamento ${paymentId}`);
  revalidatePath("/admin/reports");
  redirect(`/admin/reports?cupom=${code}`);
}

/** Tira da lista de alertas um pagamento que já foi atendido por fora. */
export async function resolvePaymentAction(formData: FormData) {
  await requireAdmin();

  const paymentId = String(formData.get("paymentId") ?? "").replace(/\D/g, "");
  if (paymentId) {
    await createAdminClient()
      .from("payment_followups")
      .upsert(
        { provider_payment_id: paymentId, resolved_at: new Date().toISOString() },
        { onConflict: "provider_payment_id" }
      );
  }

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}
