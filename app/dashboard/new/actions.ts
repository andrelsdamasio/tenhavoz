"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDraftCampaign } from "@/lib/campaigns";
import { getAppSettings } from "@/lib/settings";
import { isValidHexColor } from "@/lib/color";
import {
  parseDriveLink,
  parseRecipients,
  parseSendMode,
  parseTemplateId,
} from "@/lib/campaign-input";

export interface NewCampaignState {
  error: string | null;
}

export async function createCampaignAction(
  _prevState: NewCampaignState,
  formData: FormData
): Promise<NewCampaignState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const manifestText = String(formData.get("manifestText") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const recipients = parseRecipients(String(formData.get("recipients") ?? ""));
  const slug = String(formData.get("slug") ?? "").trim();
  const themeColorRaw = String(formData.get("themeColor") ?? "").trim();
  const themeColor = themeColorRaw && isValidHexColor(themeColorRaw) ? themeColorRaw : null;

  if (!title || !manifestText || !subject) {
    return { error: "Preencha título, assunto e texto do manifesto." };
  }

  if (recipients.length === 0) {
    return { error: "Informe pelo menos um e-mail de destino." };
  }

  const settings = await getAppSettings(supabase);
  const { manifest_char_limit: charLimit, manifest_char_limit_enabled: charLimitEnabled } =
    settings;

  const sendModeResult = parseSendMode(formData.get("sendMode"));
  if (!sendModeResult.ok) return { error: sendModeResult.error };

  const driveLinkResult = parseDriveLink(String(formData.get("driveLink") ?? ""));
  if (!driveLinkResult.ok) return { error: driveLinkResult.error };

  const templateIdResult = parseTemplateId(formData.get("templateId"), settings.enabled_templates);
  if (!templateIdResult.ok) return { error: templateIdResult.error };

  if (charLimitEnabled && manifestText.length > charLimit) {
    return {
      error: `O texto do manifesto tem ${manifestText.length} caracteres — o limite atual é ${charLimit}. Encurte o texto (ou use "Encurtar com IA") antes de continuar.`,
    };
  }

  const campaign = await createDraftCampaign(supabase, user.id, {
    title,
    subtitle,
    manifestText,
    subject,
    recipients,
    sendMode: sendModeResult.value,
    driveLink: driveLinkResult.value,
    templateId: templateIdResult.value,
    slug,
    themeColor,
  });

  redirect(`/dashboard/checkout?campaignId=${campaign.id}`);
}
