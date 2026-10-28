"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { sendFromInbox } from "@/lib/inbox";

const UUID = /^[0-9a-f-]{36}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
}

export async function markInboxReadAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) {
    await createAdminClient()
      .from("inbox_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
  }

  revalidatePath("/admin/inbox");
  redirect(`/admin/inbox?id=${id}`);
}

/** Responde a uma mensagem recebida (ou escreve uma nova, sem replyToId). */
export async function sendInboxEmailAction(formData: FormData) {
  await requireAdmin();

  const replyToId = String(formData.get("replyToId") ?? "");
  const result = await sendFromInbox(createAdminClient(), {
    to: String(formData.get("to") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    replyToId: UUID.test(replyToId) ? replyToId : null,
  });

  revalidatePath("/admin/inbox");
  const back = UUID.test(replyToId) ? `id=${replyToId}` : "compose=1";
  if (!result.ok) {
    redirect(`/admin/inbox?${back}&erro=${encodeURIComponent(result.error ?? "Falha ao enviar.")}`);
  }
  redirect(`/admin/inbox?${UUID.test(replyToId) ? `id=${replyToId}&` : "box=out&"}enviado=1`);
}

/** Marca como lida ao abrir a mensagem (sem redirecionar) e atualiza o selo do menu. */
export async function markInboxReadOnOpenAction(id: string) {
  await requireAdmin();
  if (!UUID.test(id)) return;

  await createAdminClient()
    .from("inbox_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("direction", "in")
    .is("read_at", null);

  // O selo fica no layout, então revalida o layout inteiro do admin.
  revalidatePath("/admin", "layout");
}
