"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCampaignForOwner,
  isCampaignEditable,
  updateCampaign,
} from "@/lib/campaigns";
import { getAppSettings } from "@/lib/settings";
import { isValidHexColor } from "@/lib/color";
import type { SendMode, TemplateId } from "@/lib/types";
import type { NewCampaignState } from "@/app/dashboard/new/actions";

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

export async function updateCampaignAction(
  _prevState: NewCampaignState,
  formData: FormData
): Promise<NewCampaignState> {
  const campaignId = String(formData.get("campaignId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaign = await getCampaignForOwner(supabase, campaignId);
  if (!campaign || campaign.user_id !== user.id) {
    redirect("/dashboard");
  }

  if (!isCampaignEditable(campaign)) {
    return { error: "O prazo de 24 horas para editar essa campanha já passou." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const manifestText = String(formData.get("manifestText") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const recipients = parseRecipients(String(formData.get("recipients") ?? ""));
  const sendMode = String(formData.get("sendMode") ?? "bcc") as SendMode;
  const driveLink = String(formData.get("driveLink") ?? "").trim() || null;
  const templateId = Number(formData.get("templateId") ?? "1") as TemplateId;
  const slug = String(formData.get("slug") ?? "").trim();
  const themeColorRaw = String(formData.get("themeColor") ?? "").trim();
  const themeColor = themeColorRaw && isValidHexColor(themeColorRaw) ? themeColorRaw : null;

  if (!title || !manifestText || !subject) {
    return { error: "Preencha título, assunto e texto do manifesto." };
  }

  if (recipients.length === 0) {
    return { error: "Informe pelo menos um e-mail de destino." };
  }

  const { manifest_char_limit: charLimit, manifest_char_limit_enabled: charLimitEnabled } =
    await getAppSettings(supabase);

  if (charLimitEnabled && manifestText.length > charLimit) {
    return {
      error: `O texto do manifesto tem ${manifestText.length} caracteres — o limite atual é ${charLimit}. Encurte o texto (ou use "Encurtar com IA") antes de continuar.`,
    };
  }

  let updated;
  try {
    updated = await updateCampaign(supabase, campaignId, user.id, {
      title,
      manifestText,
      subject,
      recipients,
      sendMode,
      driveLink,
      templateId,
      slug,
      themeColor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SLUG_TAKEN") {
      return { error: "Esse link já está em uso por outra campanha. Escolha outro." };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  if (campaign.slug) revalidatePath(`/${campaign.slug}`);
  if (updated.slug && updated.slug !== campaign.slug) revalidatePath(`/${updated.slug}`);

  redirect("/dashboard?edited=1");
}
