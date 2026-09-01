import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Campaign, SendMode, TemplateId } from "@/lib/types";
import { generateSlug, isReservedSlug, sanitizeSlug } from "@/lib/slug";

export interface CreateCampaignInput {
  title: string;
  manifestText: string;
  subject: string;
  recipients: string[];
  sendMode: SendMode;
  driveLink: string | null;
  templateId: TemplateId;
  /** Slug desejado pelo usuário (será saneado). Se vazio, é derivado do título. */
  slug?: string;
  /** Cor hex escolhida para a template; null/undefined = cor padrão. */
  themeColor?: string | null;
}

const UNIQUE_VIOLATION = "23505";

/**
 * Reserva o slug já na criação do rascunho (não só na publicação), pra o
 * usuário ver e poder personalizar o link curto antes mesmo de pagar. Se o
 * slug desejado já estiver em uso, cai para um slug com sufixo aleatório em
 * vez de falhar — o usuário nunca perde o rascunho por causa de um link
 * duplicado.
 */
export async function createDraftCampaign(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateCampaignInput
): Promise<Campaign> {
  const desiredRaw = sanitizeSlug(input.slug || input.title) || sanitizeSlug(input.title);
  const desiredSlug =
    desiredRaw && !isReservedSlug(desiredRaw) ? desiredRaw : generateSlug(input.title);

  const baseRow = {
    user_id: userId,
    title: input.title,
    manifest_text: input.manifestText,
    subject: input.subject,
    recipients: input.recipients,
    send_mode: input.sendMode,
    drive_link: input.driveLink,
    template_id: input.templateId,
    theme_color: input.themeColor ?? null,
    status: "draft" as const,
  };

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ...baseRow, slug: desiredSlug })
    .select()
    .single();

  if (!error) return data;

  if (error.code !== UNIQUE_VIOLATION) throw error;

  // Slug já estava em uso — tenta de novo com um sufixo aleatório.
  const { data: retryData, error: retryError } = await supabase
    .from("campaigns")
    .insert({ ...baseRow, slug: generateSlug(input.title) })
    .select()
    .single();

  if (retryError) throw retryError;
  return retryData;
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

/**
 * Exclui a campanha do usuário logado. A policy de RLS já restringe isso a
 * `auth.uid() = user_id`, mas o filtro extra por userId aqui é defesa a
 * mais — e faz o delete simplesmente não afetar nada (0 linhas) se o
 * chamador de alguma forma passar um campaignId de outra pessoa, em vez de
 * um erro. Pagamentos associados somem junto (on delete cascade na tabela
 * payments) — é uma exclusão permanente, sem confirmação adicional além da
 * que a UI já pede antes de chamar isto.
 */
export async function deleteCampaign(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("user_id", userId);

  if (error) throw error;
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

export interface PublishResult {
  campaign: Campaign;
  /** false só na primeira vez que esta campanha é publicada — usado pra
   * decidir se um cupom associado ao pagamento deve ser resgatado (contador
   * incrementado), evitando contar duas vezes um reenvio de webhook. */
  alreadyPublished: boolean;
}

/**
 * Só ponto do sistema que publica uma campanha. É idempotente de propósito:
 * webhooks de pagamento podem reenviar o mesmo evento (retry do Stripe /
 * Mercado Pago), então publicar duas vezes não pode gerar dois slugs.
 */
export async function publishCampaignAfterConfirmedPayment(
  admin: SupabaseClient<Database>,
  campaignId: string
): Promise<PublishResult> {
  const { data: campaign, error: fetchError } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (fetchError) throw fetchError;

  if (campaign.status === "published" && campaign.slug) {
    return { campaign, alreadyPublished: true };
  }

  const slug = campaign.slug ?? generateSlug(campaign.title);

  const { data: updated, error: updateError } = await admin
    .from("campaigns")
    .update({ status: "published", slug })
    .eq("id", campaignId)
    .select()
    .single();

  if (updateError) throw updateError;
  return { campaign: updated, alreadyPublished: false };
}
