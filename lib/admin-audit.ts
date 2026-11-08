import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAuditEntry, Database } from "@/lib/types";

/** Registra uma ação do admin. Nunca derruba a ação em si se o registro falhar. */
export async function logAdminAction(
  admin: SupabaseClient<Database>,
  entry: { adminEmail: string; action: string; campaignId: string | null; details?: Record<string, unknown> }
): Promise<void> {
  try {
    const { error } = await admin.from("admin_audit_log").insert({
      admin_email: entry.adminEmail,
      action: entry.action,
      campaign_id: entry.campaignId,
      details: entry.details ?? {},
    });
    if (error) throw error;
  } catch (err) {
    console.error("[admin-audit] falha ao registrar a ação", entry.action, err);
  }
}

export async function listAdminActions(
  admin: SupabaseClient<Database>,
  campaignId: string,
  limit = 20
): Promise<AdminAuditEntry[]> {
  const { data, error } = await admin
    .from("admin_audit_log")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-audit] falha ao listar o histórico", error);
    return [];
  }
  return data ?? [];
}
