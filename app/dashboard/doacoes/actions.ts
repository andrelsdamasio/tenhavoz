"use server";

import { closeAndNotifyFundraisers } from "@/lib/fundraiser-closing";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { hasConnection } from "@/lib/mp-oauth";

/** Publica a campanha. Só com a conta Mercado Pago conectada (é de lá que o dinheiro entra). */
export async function publishFundraiserAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes");

  const admin = createAdminClient();
  if (!(await isFundraisingEnabled(admin))) redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/dashboard/doacoes");

  const { data: f } = await admin.from("fundraisers").select("id, user_id, status").eq("id", id).maybeSingle();
  if (!f || f.user_id !== user.id) redirect("/dashboard/doacoes");

  if (!(await hasConnection(admin, user.id))) redirect("/dashboard/doacoes?mp=conecte");
  if (f.status === "draft") {
    await admin.from("fundraisers").update({ status: "active", published_at: new Date().toISOString() }).eq("id", id).eq("status", "draft");
  }
  revalidatePath("/dashboard/doacoes");
  redirect("/dashboard/doacoes?publicada=1");
}

/** Encerra a campanha (pára de receber doações; a página continua visível). */
export async function endFundraiserAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/doacoes");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/dashboard/doacoes");
  const admin = createAdminClient();
  const { data: ended } = await admin.from("fundraisers").update({ status: "ended" }).eq("id", id).eq("user_id", user.id).eq("status", "active").select("id");
  if (ended && ended.length > 0) {
    try {
      await closeAndNotifyFundraisers(admin, id);
    } catch (err) {
      console.error("[doacoes] falha ao avisar o encerramento", err);
    }
  }
  revalidatePath("/dashboard/doacoes");
  redirect("/dashboard/doacoes");
}
