import type { SupabaseClient } from "@supabase/supabase-js";

export interface Ad {
  advertiser: string;
  title: string;
  text: string;
  url: string;
}

/** Só aceita endereços https e remove espaços; qualquer outra coisa invalida o anúncio. */
export function normalizeAdUrl(raw: string): string | null {
  const value = raw.trim();
  if (value.length > 500) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Valida os campos do formulário do admin. Retorna o erro em português ou o anúncio limpo. */
export function parseAdInput(input: { advertiser: string; title: string; text: string; url: string }):
  | { ok: true; ad: Ad }
  | { ok: false; error: string } {
  const advertiser = input.advertiser.trim();
  const title = input.title.trim();
  const text = input.text.trim();
  const url = normalizeAdUrl(input.url);
  if (!advertiser || advertiser.length > 60) return { ok: false, error: "Informe o anunciante (até 60 letras)." };
  if (!title || title.length > 80) return { ok: false, error: "Informe o título (até 80 letras)." };
  if (!text || text.length > 200) return { ok: false, error: "Informe o texto (até 200 letras)." };
  if (!url) return { ok: false, error: "O link precisa começar com https://." };
  return { ok: true, ad: { advertiser, title, text, url } };
}

/** Anúncio ligado pelo admin, ou null. Nunca derruba a página se a leitura falhar. */
export async function getActiveAd(client: unknown): Promise<Ad | null> {
  try {
    const supabase = client as SupabaseClient;
    const { data } = await supabase
      .from("app_settings")
      .select("ad_enabled, ad_advertiser, ad_title, ad_text, ad_url")
      .eq("id", true)
      .maybeSingle();
    const row = data as { ad_enabled?: boolean; ad_advertiser?: string; ad_title?: string; ad_text?: string; ad_url?: string } | null;
    if (!row?.ad_enabled) return null;
    const parsed = parseAdInput({ advertiser: row.ad_advertiser ?? "", title: row.ad_title ?? "", text: row.ad_text ?? "", url: row.ad_url ?? "" });
    return parsed.ok ? parsed.ad : null;
  } catch {
    return null;
  }
}
