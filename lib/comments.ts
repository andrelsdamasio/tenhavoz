import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignComment, Database } from "@/lib/types";

export const COMMENT_MAX_LENGTH = 500;
export const COMMENT_MIN_LENGTH = 2;
/** Limite por pessoa: evita enxurrada de mensagens. */
export const COMMENT_RATE_LIMIT = 5;
export const COMMENT_RATE_WINDOW_MS = 10 * 60 * 1000;
const PAGE_LIMIT = 50;

export type CommentCheck = { ok: true; value: string } | { ok: false; error: string };

/** Texto do comentário: limpa, limita e barra links (principal porta de entrada de spam). */
export function validateCommentBody(raw: string): CommentCheck {
  const value = raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (value.length < COMMENT_MIN_LENGTH) return { ok: false, error: "Escreva um comentário um pouco maior." };
  if (value.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `O comentário pode ter até ${COMMENT_MAX_LENGTH} caracteres.` };
  }
  if (/(https?:\/\/|www\.)/i.test(value)) {
    return { ok: false, error: "Links não são permitidos nos comentários." };
  }
  return { ok: true, value };
}

/** Nome mostrado ao lado do comentário: nunca o e-mail inteiro. */
export function displayNameFor(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fromMeta = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  const base = fromMeta ?? (user.email ?? "").split("@")[0] ?? "";
  const first = base.trim().split(/[\s._\-+0-9]+/)[0] ?? "";
  const clean = first.replace(/[^\p{L}]/gu, "").slice(0, 20);
  if (clean.length < 2) return "Apoiador";
  return clean.charAt(0).toLocaleUpperCase("pt-BR") + clean.slice(1).toLocaleLowerCase("pt-BR");
}

/** Comentário como vai para a página pública: sem ids de usuários. */
export interface PublicComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function listComments(
  admin: SupabaseClient<Database>,
  campaignId: string
): Promise<PublicComment[]> {
  const { data, error } = await admin
    .from("campaign_comments")
    .select("id, author_name, body, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(PAGE_LIMIT);
  if (error) throw error;
  return data ?? [];
}

export async function countRecentComments(
  admin: SupabaseClient<Database>,
  userId: string,
  now = Date.now()
): Promise<number> {
  const since = new Date(now - COMMENT_RATE_WINDOW_MS).toISOString();
  const { count, error } = await admin
    .from("campaign_comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function listReportedComments(admin: SupabaseClient<Database>): Promise<
  (CampaignComment & { campaignTitle: string | null; campaignSlug: string | null })[]
> {
  const { data, error } = await admin
    .from("campaign_comments")
    .select("*")
    .not("reported_at", "is", null)
    .order("reported_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.campaign_id))];
  const { data: campaigns } = await admin.from("campaigns").select("id, title, slug").in("id", ids);
  const byId = new Map((campaigns ?? []).map((c) => [c.id, c]));
  return rows.map((r) => ({
    ...r,
    campaignTitle: byId.get(r.campaign_id)?.title ?? null,
    campaignSlug: byId.get(r.campaign_id)?.slug ?? null,
  }));
}

export async function countReportedComments(admin: SupabaseClient<Database>): Promise<number> {
  const { count, error } = await admin
    .from("campaign_comments")
    .select("id", { count: "exact", head: true })
    .not("reported_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}
