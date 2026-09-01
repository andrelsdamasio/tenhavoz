"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDraftCampaign } from "@/lib/campaigns";
import type { SendMode, TemplateId } from "@/lib/types";

export interface NewCampaignState {
  error: string | null;
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
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
  const manifestText = String(formData.get("manifestText") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const recipients = parseRecipients(String(formData.get("recipients") ?? ""));
  const sendMode = String(formData.get("sendMode") ?? "bcc") as SendMode;
  const driveLink = String(formData.get("driveLink") ?? "").trim() || null;
  const templateId = Number(formData.get("templateId") ?? "1") as TemplateId;
  const slug = String(formData.get("slug") ?? "").trim();

  if (!title || !manifestText || !subject) {
    return { error: "Preencha título, assunto e texto do manifesto." };
  }

  if (recipients.length === 0) {
    return { error: "Informe pelo menos um e-mail de destino." };
  }

  const campaign = await createDraftCampaign(supabase, user.id, {
    title,
    manifestText,
    subject,
    recipients,
    sendMode,
    driveLink,
    templateId,
    slug,
  });

  redirect(`/dashboard/checkout?campaignId=${campaign.id}`);
}
