"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-audit";

/** Suspende (tira do ar) ou reativa uma campanha de arrecadação. Fica registrado no histórico do admin. */
export async function setFundraiserStatusAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const id = String(formData.get("fundraiserId") ?? "");
  const next = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || (next !== "suspended" && next !== "active")) {
    redirect("/admin/arrecadacoes");
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("fundraisers").select("slug, status").eq("id", id).maybeSingle();
  if (!current) redirect("/admin/arrecadacoes");
  // Só alterna entre no ar e suspensa: rascunhos e campanhas encerradas ficam como estão.
  if (current.status !== "active" && current.status !== "suspended") redirect("/admin/arrecadacoes");

  const { error } = await admin.from("fundraisers").update({ status: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    console.error("[admin] falha ao mudar o status da arrecadação", { id, next, error });
    redirect("/admin/arrecadacoes?erro=1");
  }

  await logAdminAction(admin, {
    adminEmail: user.email ?? "",
    action: next === "suspended" ? "fundraiser_suspended" : "fundraiser_reactivated",
    campaignId: null,
    details: { fundraiserId: id, slug: current.slug },
  });

  revalidatePath("/admin/arrecadacoes");
  revalidatePath(`/d/${current.slug}`);
  revalidatePath("/");
  redirect("/admin/arrecadacoes?ok=1");
}
