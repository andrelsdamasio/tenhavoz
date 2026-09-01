import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Campaign, SendMode, TemplateId } from "@/lib/types";
import { generateSlug } from "@/lib/slug";

export interface CreateCampaignInput {
  title: string;
  manifestText: string;
  subject: string;
  recipients: string[];
  sendMode: SendMode;
  driveLink: string | null;
  templateId: TemplateId;
}

export async function createDraftCampaign(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateCampaignInput
): Promise<Campaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      title: input.title,
      manifest_text: input.manifestText,
      subject: input.subject,
      recipients: input.recipients,
      send_mode: input.sendMode,
      drive_link: input.driveLink,
      template_id: input.templateId,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listCampaignsForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCampaignForOwner(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublishedCampaignBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Só ponto do sistema que publica uma campanha. É idempotente de propósito:
 * webhooks de pagamento podem reenviar o mesmo evento (retry do Stripe /
 * Mercado Pago), então publicar duas vezes não pode gerar dois slugs.
 */
export async function publishCampaignAfterConfirmedPayment(
  admin: SupabaseClient<Database>,
  campaignId: string
): Promise<Campaign> {
  const { data: campaign, error: fetchError } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (fetchError) throw fetchError;

  if (campaign.status === "published" && campaign.slug) {
    return campaign;
  }

  const slug = campaign.slug ?? generateSlug(campaign.title);

  const { data: updated, error: updateError } = await admin
    .from("campaigns")
    .update({ status: "published", slug })
    .eq("id", campaignId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
}
