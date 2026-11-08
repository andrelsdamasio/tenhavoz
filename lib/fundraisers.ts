import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Fundraiser, FundraiserBudgetItem } from "@/lib/types";
import { generateSlug, isReservedSlug, sanitizeSlug } from "@/lib/slug";

export const GOAL_MIN_CENTS = 1000; // R$ 10
export const GOAL_MAX_CENTS = 100_000_000; // R$ 1.000.000
export const MAX_BUDGET_ITEMS = 20;
export const MAX_DURATION_DAYS = 365;
/** Comissão padrão da plataforma por doação, em pontos-base (400 = 4%). */
export const DEFAULT_FEE_BPS = 400;

/** "1.234,56" ou "1234.5" → centavos; null se não for um valor válido. */
export function parseBRLToCents(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isFinite(cents) ? cents : null;
}

export function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Comissão da plataforma (arredondada para baixo) sobre o valor da doação. */
export function platformFeeCents(amountCents: number, feeBps: number = DEFAULT_FEE_BPS): number {
  return Math.floor((amountCents * feeBps) / 10_000);
}

export interface BudgetLine {
  label: string;
  amountCents: number;
  description?: string | null;
  /** Posição da linha no formulário (para casar com o arquivo anexado). */
  row?: number;
}

export const DOC_MAX_BYTES = 3 * 1024 * 1024; // 3 MB por documento
export const DOC_MAX_TOTAL_BYTES = 4 * 1024 * 1024; // limite do corpo da requisição na Vercel é ~4,5 MB
export const DOC_ALLOWED_EXT = ["pdf", "xlsx", "xls", "csv", "ods", "doc", "docx", "png", "jpg", "jpeg"];

/** Nome seguro para guardar o arquivo; null se o tipo não for permitido. */
export function safeDocName(name: string): string | null {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (!DOC_ALLOWED_EXT.includes(ext)) return null;
  const base = name
    .slice(0, dot)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "documento"}.${ext}`;
}

/** Confere tipo e tamanho dos documentos do orçamento; devolve a mensagem de erro ou null. */
export function validateDocs(files: { name: string; size: number }[]): string | null {
  let total = 0;
  for (const f of files) {
    if (f.size === 0) continue;
    if (!safeDocName(f.name)) return `"${f.name}": envie PDF, planilha (xlsx, xls, csv, ods), documento (doc, docx) ou imagem (png, jpg).`;
    if (f.size > DOC_MAX_BYTES) return `"${f.name}" passa de 3 MB. Envie um arquivo menor.`;
    total += f.size;
  }
  if (total > DOC_MAX_TOTAL_BYTES) return "Os documentos juntos passam de 4 MB. Anexe menos arquivos ou arquivos menores.";
  return null;
}

export interface FundraiserInput {
  title: string;
  summary: string;
  story: string;
  goalCents: number;
  endsAt: string | null;
  beneficiaryName: string | null;
  budget: BudgetLine[];
  slug?: string;
  templateId: number;
  themeColor: string | null;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Valida o que veio do formulário. Mensagens em português, prontas para a tela. */
export function parseFundraiserForm(form: FormData, now: Date = new Date()): ParseResult<FundraiserInput> {
  const title = String(form.get("title") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const story = String(form.get("story") ?? "").trim();
  const beneficiary = String(form.get("beneficiaryName") ?? "").trim();

  if (title.length < 5 || title.length > 90) return { ok: false, error: "O título precisa ter entre 5 e 90 caracteres." };
  if (summary.length > 300) return { ok: false, error: "O resumo pode ter no máximo 300 caracteres." };
  if (story.length < 50) return { ok: false, error: "Conte a história com pelo menos 50 caracteres, para quem vai doar entender." };
  if (story.length > 6000) return { ok: false, error: "A história pode ter no máximo 6.000 caracteres." };

  const goalCents = parseBRLToCents(String(form.get("goal") ?? ""));
  if (goalCents === null) return { ok: false, error: "Informe a meta em reais, por exemplo 5.000,00." };
  if (goalCents < GOAL_MIN_CENTS || goalCents > GOAL_MAX_CENTS) {
    return { ok: false, error: "A meta precisa estar entre R$ 10,00 e R$ 1.000.000,00." };
  }

  let endsAt: string | null = null;
  const endsRaw = String(form.get("endsAt") ?? "").trim();
  if (endsRaw) {
    const d = new Date(`${endsRaw}T23:59:59-03:00`);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Data final inválida." };
    if (d.getTime() <= now.getTime()) return { ok: false, error: "A data final precisa ser no futuro." };
    if (d.getTime() - now.getTime() > MAX_DURATION_DAYS * 86_400_000) {
      return { ok: false, error: "O prazo máximo é de 1 ano." };
    }
    endsAt = d.toISOString();
  }

  const labels = form.getAll("budgetLabel").map((v) => String(v).trim());
  const amounts = form.getAll("budgetAmount").map((v) => String(v).trim());
  const descriptions = form.getAll("budgetDescription").map((v) => String(v).trim());
  const budget: BudgetLine[] = [];
  for (let i = 0; i < Math.max(labels.length, amounts.length); i++) {
    const label = labels[i] ?? "";
    const amountRaw = amounts[i] ?? "";
    if (!label && !amountRaw) continue; // linha em branco
    if (label.length < 2 || label.length > 120) return { ok: false, error: `Orçamento, linha ${i + 1}: descreva o item (2 a 120 caracteres).` };
    const cents = parseBRLToCents(amountRaw);
    if (cents === null) return { ok: false, error: `Orçamento, linha ${i + 1}: informe o valor em reais.` };
    const description = descriptions[i] ?? "";
    if (description.length > 300) return { ok: false, error: `Orçamento, linha ${i + 1}: a explicação pode ter no máximo 300 caracteres.` };
    budget.push({ label, amountCents: cents, description: description || null, row: i });
  }
  if (budget.length > MAX_BUDGET_ITEMS) return { ok: false, error: `Use no máximo ${MAX_BUDGET_ITEMS} itens no orçamento.` };

  const templateId = Number(form.get("templateId") ?? 1);
  if (!Number.isInteger(templateId) || templateId < 1 || templateId > 9) return { ok: false, error: "Modelo de página inválido." };
  const themeColor = String(form.get("themeColor") ?? "").trim() || null;
  if (themeColor && !/^#[0-9a-fA-F]{6}$/.test(themeColor)) return { ok: false, error: "Cor inválida." };

  return {
    ok: true,
    value: {
      title,
      summary,
      story,
      goalCents,
      endsAt,
      beneficiaryName: beneficiary || null,
      budget,
      slug: String(form.get("slug") ?? "").trim() || undefined,
      templateId,
      themeColor,
    },
  };
}

/** Diferença entre a soma do orçamento e a meta (para avisar, não para bloquear). */
export function budgetGapCents(goalCents: number, budget: BudgetLine[]): number {
  return budget.reduce((sum, b) => sum + b.amountCents, 0) - goalCents;
}

const UNIQUE_VIOLATION = "23505";

export async function createFundraiserDraft(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: FundraiserInput
): Promise<Fundraiser> {
  const desired = sanitizeSlug(input.slug || input.title);
  const first = desired && !isReservedSlug(desired) ? desired : generateSlug(input.title);

  const row = {
    user_id: userId,
    title: input.title,
    summary: input.summary || null,
    story: input.story,
    goal_cents: input.goalCents,
    ends_at: input.endsAt,
    beneficiary_name: input.beneficiaryName,
    template_id: input.templateId,
    theme_color: input.themeColor,
    status: "draft" as const,
  };

  let res = await supabase.from("fundraisers").insert({ ...row, slug: first }).select().single();
  if (res.error?.code === UNIQUE_VIOLATION) {
    res = await supabase.from("fundraisers").insert({ ...row, slug: generateSlug(input.title) }).select().single();
  }
  if (res.error) throw res.error;
  const fundraiser = res.data as Fundraiser;

  if (input.budget.length > 0) {
    const { error } = await supabase.from("fundraiser_budget_items").insert(
      input.budget.map((b, i) => ({
        fundraiser_id: fundraiser.id,
        position: i,
        label: b.label,
        amount_cents: b.amountCents,
        description: b.description ?? null,
      }))
    );
    if (error) {
      await supabase.from("fundraisers").delete().eq("id", fundraiser.id);
      throw error;
    }
  }
  return fundraiser;
}

export async function listFundraisersForUser(supabase: SupabaseClient<Database>, userId: string): Promise<Fundraiser[]> {
  const { data, error } = await supabase
    .from("fundraisers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Fundraiser[];
}

export async function listBudgetItems(supabase: SupabaseClient<Database>, fundraiserId: string): Promise<FundraiserBudgetItem[]> {
  const { data } = await supabase
    .from("fundraiser_budget_items")
    .select("*")
    .eq("fundraiser_id", fundraiserId)
    .order("position", { ascending: true });
  return (data ?? []) as FundraiserBudgetItem[];
}

/** A chave que liga o recurso de doações para o público. Desligada por padrão. */
export async function isFundraisingEnabled(supabase: SupabaseClient<Database>): Promise<boolean> {
  try {
    const { data } = await supabase.from("app_settings").select("fundraising_enabled").eq("id", true).maybeSingle();
    return Boolean((data as { fundraising_enabled?: boolean } | null)?.fundraising_enabled);
  } catch {
    return false;
  }
}

/**
 * Sobe os documentos do orçamento para o armazenamento e grava o link em cada item.
 * Nunca derruba a criação da campanha: se um arquivo falhar, o item fica sem anexo.
 */
export async function attachBudgetDocs(
  supabase: SupabaseClient<Database>,
  fundraiserId: string,
  budget: BudgetLine[],
  files: (File | string)[]
): Promise<number> {
  let failed = 0;
  for (let j = 0; j < budget.length; j++) {
    const file = files[budget[j]!.row ?? j];
    if (!file || typeof file === "string" || file.size === 0) continue;
    const safe = safeDocName(file.name);
    if (!safe) continue;
    const path = `${fundraiserId}/${j}-${safe}`;
    const up = await supabase.storage.from("fundraiser-docs").upload(path, await file.arrayBuffer(), {
      contentType: file.type || undefined,
      upsert: true,
    });
    if (up.error) {
      failed++;
      console.error("[doacoes] falha ao subir documento", up.error.message);
      continue;
    }
    const { data } = supabase.storage.from("fundraiser-docs").getPublicUrl(path);
    await supabase
      .from("fundraiser_budget_items")
      .update({ attachment_url: data.publicUrl, attachment_name: safe })
      .eq("fundraiser_id", fundraiserId)
      .eq("position", j);
  }
  return failed;
}
