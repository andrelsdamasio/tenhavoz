"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { parseRecipients } from "@/lib/campaign-input";
import { invalidEmailsMessage } from "@/lib/email-address";
import { logAdminAction } from "@/lib/admin-audit";

const ALLOWED_EXTENSION_DAYS = [1, 7, 30];

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email) || !user.email) redirect("/dashboard");
  return user.email;
}

function back(id: string, params: Record<string, string>): never {
  revalidatePath(`/admin/reports/campanha/${id}`);
  revalidatePath("/admin/reports");
  redirect(`/admin/reports/campanha/${id}?${new URLSearchParams(params).toString()}`);
}

/** Estende (ou reativa, se já encerrou) o prazo de uma campanha no ar. */
export async function extendDeadlineAction(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("campaignId") ?? "");
  const days = Number(formData.get("days"));
  if (!id || !ALLOWED_EXTENSION_DAYS.includes(days)) back(id, { erro: "Prazo inválido." });

  const admin = createAdminClient();
  const { data: campaign, error } = await admin
    .from("campaigns")
    .select("id, status, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !campaign) back(id, { erro: "Campanha não encontrada." });
  if (campaign.status === "draft") back(id, { erro: "Campanha ainda é rascunho (não foi paga)." });

  const base = Math.max(Date.now(), campaign.expires_at ? new Date(campaign.expires_at).getTime() : 0);
  const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await admin
    .from("campaigns")
    .update({ expires_at: expiresAt, status: "published", expiry_notified_at: null })
    .eq("id", id);
  if (updateError) {
    console.error("[admin] falha ao estender o prazo", { id, updateError });
    back(id, { erro: "Não foi possível estender o prazo agora." });
  }

  await logAdminAction(admin, {
    adminEmail,
    action: "extend_deadline",
    campaignId: id,
    details: { days, from: campaign.expires_at, to: expiresAt },
  });
  back(id, { ok: `Prazo estendido em ${days} dia(s).` });
}

/** Corrige a lista de destinatários (mesma validação do formulário do cliente). */
export async function updateRecipientsAction(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("campaignId") ?? "");
  const recipients = parseRecipients(String(formData.get("recipients") ?? ""));

  if (recipients.length === 0) back(id, { erro: "Informe pelo menos um e-mail." });
  const invalid = invalidEmailsMessage(recipients);
  if (invalid) back(id, { erro: invalid });

  const admin = createAdminClient();
  const { data: before } = await admin.from("campaigns").select("recipients").eq("id", id).maybeSingle();
  const { error } = await admin.from("campaigns").update({ recipients }).eq("id", id);
  if (error) {
    console.error("[admin] falha ao atualizar destinatários", { id, error });
    back(id, { erro: "Não foi possível salvar os destinatários agora." });
  }

  await logAdminAction(admin, {
    adminEmail,
    action: "update_recipients",
    campaignId: id,
    details: { before: before?.recipients ?? null, after: recipients },
  });
  back(id, { ok: "Destinatários atualizados." });
}
