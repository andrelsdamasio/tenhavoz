"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
}

/** Denúncia sem fundamento: o comentário fica e sai da fila. */
export async function dismissReportAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("commentId") ?? "");
  const { error } = await createAdminClient().from("campaign_comments").update({ reported_at: null }).eq("id", id);
  if (error) console.error("[admin] falha ao limpar a denúncia", error);
  revalidatePath("/admin/comments");
  redirect("/admin/comments");
}

/** Apaga o comentário denunciado (e atualiza a página pública da campanha). */
export async function deleteReportedCommentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("commentId") ?? "");
  const admin = createAdminClient();
  const { data: comment } = await admin.from("campaign_comments").select("campaign_id").eq("id", id).maybeSingle();
  const { error } = await admin.from("campaign_comments").delete().eq("id", id);
  if (error) console.error("[admin] falha ao apagar o comentário", error);
  if (comment) {
    const { data: campaign } = await admin.from("campaigns").select("slug").eq("id", comment.campaign_id).maybeSingle();
    if (campaign?.slug) revalidatePath(`/${campaign.slug}`);
  }
  revalidatePath("/admin/comments");
  redirect("/admin/comments");
}
