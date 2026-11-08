"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { isCampaignExpired } from "@/lib/campaigns";
import {
  COMMENT_RATE_LIMIT,
  COMMENT_RATE_WINDOW_MS,
  countRecentComments,
  displayNameFor,
  validateCommentBody,
} from "@/lib/comments";

export interface CommentState {
  error: string | null;
  posted: boolean;
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function postCommentAction(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const user = await currentUser();
  if (!user) return { error: "Entre na sua conta para comentar.", posted: false };

  const campaignId = String(formData.get("campaignId") ?? "");
  const check = validateCommentBody(String(formData.get("body") ?? ""));
  if (!check.ok) return { error: check.error, posted: false };

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, slug, status, expires_at")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign || campaign.status !== "published" || !campaign.slug || isCampaignExpired(campaign as never)) {
    return { error: "Esta campanha não aceita comentários agora.", posted: false };
  }

  try {
    if ((await countRecentComments(admin, user.id)) >= COMMENT_RATE_LIMIT) {
      const minutes = Math.round(COMMENT_RATE_WINDOW_MS / 60000);
      return { error: `Você comentou várias vezes seguidas. Tente de novo em até ${minutes} minutos.`, posted: false };
    }

    const { error } = await admin.from("campaign_comments").insert({
      campaign_id: campaign.id,
      user_id: user.id,
      author_name: displayNameFor(user),
      body: check.value,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[comentarios] falha ao salvar", err);
    return { error: "Não foi possível publicar seu comentário agora. Tente de novo.", posted: false };
  }

  revalidatePath(`/${campaign.slug}`);
  return { error: null, posted: true };
}

/** Quem pode apagar: o autor, o dono da campanha e o admin. */
export async function deleteCommentAction(formData: FormData) {
  const user = await currentUser();
  if (!user) return;
  const commentId = String(formData.get("commentId") ?? "");

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("campaign_comments")
    .select("id, user_id, campaign_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return;

  const { data: campaign } = await admin
    .from("campaigns")
    .select("user_id, slug")
    .eq("id", comment.campaign_id)
    .maybeSingle();

  const allowed = comment.user_id === user.id || campaign?.user_id === user.id || isAdminEmail(user.email);
  if (!allowed) return;

  const { error } = await admin.from("campaign_comments").delete().eq("id", commentId);
  if (error) {
    console.error("[comentarios] falha ao apagar", error);
    return;
  }
  if (campaign?.slug) revalidatePath(`/${campaign.slug}`);
  revalidatePath("/admin/comments");
}

/** Qualquer pessoa logada pode denunciar; o admin analisa em /admin/comments. */
export async function reportCommentAction(formData: FormData) {
  const user = await currentUser();
  if (!user) return;
  const commentId = String(formData.get("commentId") ?? "");

  const admin = createAdminClient();
  const { error } = await admin
    .from("campaign_comments")
    .update({ reported_at: new Date().toISOString() })
    .eq("id", commentId)
    .is("reported_at", null);
  if (error) console.error("[comentarios] falha ao denunciar", error);
  revalidatePath("/admin/comments");
}

export interface LikeResult {
  ok: boolean;
  liked: boolean;
  error?: string;
}

/**
 * Curtir / descurtir (alterna). Precisa de conta; não dá para curtir o próprio
 * comentário (evita inflar o número) nem comentário de campanha fora do ar.
 */
export async function toggleLikeAction(commentId: string): Promise<LikeResult> {
  const user = await currentUser();
  if (!user) return { ok: false, liked: false, error: "Entre na sua conta para curtir." };
  if (!/^[0-9a-f-]{36}$/i.test(commentId)) return { ok: false, liked: false, error: "Comentário inválido." };

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("campaign_comments")
    .select("id, user_id, campaign_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return { ok: false, liked: false, error: "Comentário não encontrado." };
  if (comment.user_id === user.id) {
    return { ok: false, liked: false, error: "Você não pode curtir o seu próprio comentário." };
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .select("slug, status, expires_at")
    .eq("id", comment.campaign_id)
    .maybeSingle();
  if (!campaign || campaign.status !== "published" || !campaign.slug || isCampaignExpired(campaign as never)) {
    return { ok: false, liked: false, error: "Esta campanha não está mais no ar." };
  }

  try {
    const { data: existing } = await admin
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await admin.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
      if (error) throw error;
      revalidatePath(`/${campaign.slug}`);
      return { ok: true, liked: false };
    }

    const { error } = await admin.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
    // 23505: clique duplo — a curtida já existe, então o resultado é o mesmo.
    if (error && error.code !== "23505") throw error;
    revalidatePath(`/${campaign.slug}`);
    return { ok: true, liked: true };
  } catch (err) {
    console.error("[comentarios] falha ao curtir", err);
    return { ok: false, liked: false, error: "Não foi possível curtir agora. Tente de novo." };
  }
}
