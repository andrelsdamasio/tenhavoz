"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { untyped, type AdRow } from "@/lib/ad-orders";
import { notifyAdLive, notifyAdRejected, refundAdPayment } from "@/lib/ad-payments";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
}

async function loadAd(id: string): Promise<AdRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await untyped(createAdminClient()).from("ads").select("*").eq("id", id).maybeSingle();
  return data as AdRow | null;
}

function done(msg: string): never {
  revalidatePath("/admin/anuncios");
  revalidatePath("/", "layout");
  redirect(`/admin/anuncios?ok=${encodeURIComponent(msg)}`);
}

/** Aprova um anúncio pago: vai ao ar agora e fica pelo número de dias comprado. */
export async function approveAdAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const ad = await loadAd(String(formData.get("id") ?? ""));
  if (!ad || ad.status !== "in_review") done("Esse anúncio não está mais em análise.");
  const starts = new Date();
  const ends = new Date(starts.getTime() + ad.duration_days * 86_400_000);
  const { data } = await untyped(createAdminClient())
    .from("ads")
    .update({ status: "live", starts_at: starts.toISOString(), ends_at: ends.toISOString() })
    .eq("id", ad.id)
    .eq("status", "in_review")
    .select("id");
  if (data && data.length > 0) await notifyAdLive(ad, ends);
  done("Anúncio no ar.");
}

/** Recusa e devolve o dinheiro (pelo Mercado Pago); avisa quem anunciou. */
export async function rejectAdAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const ad = await loadAd(String(formData.get("id") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || "O anúncio não atende às regras de publicidade do TenhaVoz.";
  if (!ad || (ad.status !== "in_review" && ad.status !== "live")) done("Esse anúncio não pode ser recusado agora.");
  const refunded = ad.mp_payment_id ? await refundAdPayment(ad.mp_payment_id) : false;
  await untyped(createAdminClient())
    .from("ads")
    .update({ status: refunded ? "refunded" : "rejected", reject_reason: reason })
    .eq("id", ad.id);
  await notifyAdRejected(ad, reason, refunded);
  done(refunded ? "Anúncio recusado e valor devolvido." : "Anúncio recusado. O reembolso automático falhou: devolva pelo painel do Mercado Pago.");
}

/** Tira do ar antes do prazo, sem reembolso. */
export async function endAdAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    await untyped(createAdminClient()).from("ads").update({ status: "ended", ends_at: new Date().toISOString() }).eq("id", id).eq("status", "live");
  }
  done("Anúncio encerrado.");
}

/** Preço dos dois prazos, em reais (ex.: 49,90). */
export async function setAdPricesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const toCents = (raw: FormDataEntryValue | null) => {
    const n = Number(String(raw ?? "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 1 && n <= 100_000 ? Math.round(n * 100) : null;
  };
  const p7 = toCents(formData.get("price7"));
  const p30 = toCents(formData.get("price30"));
  if (p7 === null || p30 === null) redirect("/admin/anuncios?erro=" + encodeURIComponent("Informe preços válidos (ex.: 49,90)."));
  const { error } = await untyped(createAdminClient())
    .from("app_settings")
    .update({ ad_price_7d_cents: p7, ad_price_30d_cents: p30 })
    .eq("id", true);
  if (error) redirect("/admin/anuncios?erro=" + encodeURIComponent("Não foi possível salvar os preços."));
  revalidatePath("/anuncie");
  done("Preços salvos.");
}
