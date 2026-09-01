"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { updateAppSettings } from "@/lib/settings";
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

  const priceReais = Number(formData.get("priceReais"));
  const enabledTemplates = formData
    .getAll("enabledTemplates")
    .map((value) => Number(value)) as TemplateId[];
  const manifestCharLimit = Number(formData.get("manifestCharLimit"));
  const manifestCharLimitEnabled = formData.get("manifestCharLimitEnabled") === "on";

  if (!Number.isFinite(priceReais) || priceReais <= 0) {
    return { error: "Preço inválido.", success: false };
  }

  if (enabledTemplates.length === 0) {
    return { error: "Selecione ao menos um template.", success: false };
  }

  if (!Number.isFinite(manifestCharLimit) || manifestCharLimit <= 0) {
    return { error: "Limite de caracteres inválido.", success: false };
  }

  const admin = createAdminClient();

  await updateAppSettings(admin, {
    campaignPriceBrlCents: Math.round(priceReais * 100),
    enabledTemplates,
    manifestCharLimit: Math.round(manifestCharLimit),
    manifestCharLimitEnabled,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/new");
  revalidatePath("/dashboard/checkout");

  return { error: null, success: true };
}
