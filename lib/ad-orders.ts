import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAdInput, type Ad } from "@/lib/ad";

export const AD_DURATIONS = [7, 30] as const;
export type AdDuration = (typeof AD_DURATIONS)[number];
export const AD_IMAGE_MAX_BYTES = 1_048_576; // 1 MB, o mesmo limite do bucket
export const AD_IMAGE_HINT = "1200 × 628 px (formato paisagem), PNG, JPG ou WebP, até 1 MB";

export type AdStatus = "awaiting_payment" | "in_review" | "live" | "rejected" | "ended" | "refunded";

export interface AdRow {
  id: string;
  advertiser: string;
  contact_email: string;
  title: string;
  body: string;
  url: string;
  image_path: string;
  duration_days: number;
  amount_cents: number;
  status: AdStatus;
  mp_payment_id: string | null;
  paid_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

/** Anúncio pronto para aparecer numa página: texto, link e imagem. */
export interface DisplayAd extends Ad {
  imageUrl?: string;
}

/** O banco do TenhaVoz tipado não conhece a tabela `ads`; usamos o client sem tipos. */
export function untyped(client: unknown): SupabaseClient {
  return client as SupabaseClient;
}

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  in_review: "Em análise",
  live: "No ar",
  rejected: "Recusado",
  ended: "Encerrado",
  refunded: "Reembolsado",
};

/** Tipo real da imagem pelos primeiros bytes (a extensão e o `type` do navegador não valem). */
export function detectImageType(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  const eq = (offset: number, sig: number[]) => sig.every((b, i) => bytes[offset + i] === b);
  if (bytes.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (bytes.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (bytes.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return "webp";
  return null;
}

export function adPriceCents(
  duration: AdDuration,
  prices: { ad_price_7d_cents: number; ad_price_30d_cents: number }
): number {
  return duration === 7 ? prices.ad_price_7d_cents : prices.ad_price_30d_cents;
}

export function parseAdDuration(raw: string): AdDuration | null {
  const n = Number(raw);
  return (AD_DURATIONS as readonly number[]).includes(n) ? (n as AdDuration) : null;
}

export interface AdOrderInput {
  advertiser: string;
  title: string;
  body: string;
  url: string;
  email: string;
  duration: AdDuration;
}

/** Valida o texto do pedido (a imagem é validada à parte, com os bytes). */
export function parseAdOrder(form: FormData): { ok: true; value: AdOrderInput & { urlNormalized: string } } | { ok: false; error: string } {
  const parsed = parseAdInput({
    advertiser: String(form.get("advertiser") ?? ""),
    title: String(form.get("title") ?? ""),
    text: String(form.get("body") ?? ""),
    url: String(form.get("url") ?? ""),
  });
  if (!parsed.ok) return parsed;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return { ok: false, error: "Informe um e-mail válido: é para onde enviamos o recibo e o aviso de aprovação." };
  }
  const duration = parseAdDuration(String(form.get("duration") ?? ""));
  if (!duration) return { ok: false, error: "Escolha por quanto tempo o anúncio fica no ar." };
  return {
    ok: true,
    value: {
      advertiser: parsed.ad.advertiser,
      title: parsed.ad.title,
      body: parsed.ad.text,
      url: parsed.ad.url,
      urlNormalized: parsed.ad.url,
      email,
      duration,
    },
  };
}

export function adImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/ads/${path}`;
}

/** Anúncios pagos que estão no ar agora (ends_at no futuro). */
export async function listLiveAds(client: unknown): Promise<DisplayAd[]> {
  try {
    const { data } = await untyped(client)
      .from("ads")
      .select("advertiser, title, body, url, image_path")
      .eq("status", "live")
      .gt("ends_at", new Date().toISOString());
    return ((data ?? []) as Pick<AdRow, "advertiser" | "title" | "body" | "url" | "image_path">[]).map((r) => ({
      advertiser: r.advertiser,
      title: r.title,
      text: r.body,
      url: r.url,
      imageUrl: adImageUrl(r.image_path),
    }));
  } catch {
    return [];
  }
}

/** Escolhe um anúncio pago ao acaso; sem nenhum, cai no anúncio manual do admin. */
export function pickAd<T>(live: T[], fallback: T | null, random: () => number = Math.random): T | null {
  if (live.length > 0) return live[Math.min(live.length - 1, Math.floor(random() * live.length))]!;
  return fallback;
}

export async function readAdPrices(client: unknown): Promise<{ ad_price_7d_cents: number; ad_price_30d_cents: number }> {
  try {
    const { data } = await untyped(client).from("app_settings").select("ad_price_7d_cents, ad_price_30d_cents").eq("id", true).maybeSingle();
    const row = data as { ad_price_7d_cents?: number; ad_price_30d_cents?: number } | null;
    return { ad_price_7d_cents: row?.ad_price_7d_cents ?? 4900, ad_price_30d_cents: row?.ad_price_30d_cents ?? 12900 };
  } catch {
    return { ad_price_7d_cents: 4900, ad_price_30d_cents: 12900 };
  }
}

