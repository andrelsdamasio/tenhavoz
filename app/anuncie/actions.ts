"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AD_IMAGE_MAX_BYTES,
  adPriceCents,
  detectImageType,
  parseAdOrder,
  readAdPrices,
  untyped,
  type AdRow,
} from "@/lib/ad-orders";
import { adRef } from "@/lib/ad-payments";
import { createPixCharge, toPixView, type PixView } from "@/lib/checkout-pix";
import { getMercadoPagoPreferenceClient } from "@/lib/mercadopago";
import { SITE_URL } from "@/lib/mp-oauth";

export interface AdOrderState {
  error: string | null;
}

/** Teto de pedidos não pagos por hora, para ninguém encher o armazenamento de imagens. */
const MAX_UNPAID_PER_HOUR = 40;

export async function createAdOrderAction(_prev: AdOrderState, formData: FormData): Promise<AdOrderState> {
  // Campo-armadilha: robôs preenchem, pessoas não veem.
  if (String(formData.get("website") ?? "") !== "") return { error: "Não foi possível enviar." };

  const parsed = parseAdOrder(formData);
  if (!parsed.ok) return { error: parsed.error };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Envie a imagem do anúncio." };
  if (file.size > AD_IMAGE_MAX_BYTES) return { error: "A imagem passa de 1 MB. Reduza o tamanho e envie de novo." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) return { error: "A imagem precisa ser PNG, JPG ou WebP." };

  const admin = createAdminClient();
  const db = untyped(admin);
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("ads").select("id", { count: "exact", head: true }).eq("status", "awaiting_payment").gte("created_at", since);
  if ((count ?? 0) >= MAX_UNPAID_PER_HOUR) return { error: "Muitos pedidos agora. Tente de novo em alguns minutos." };

  const prices = await readAdPrices(admin);
  const amount = adPriceCents(parsed.value.duration, prices);

  const id = crypto.randomUUID();
  const path = `${id}.${type}`;
  const up = await admin.storage.from("ads").upload(path, bytes, {
    contentType: type === "jpg" ? "image/jpeg" : `image/${type}`,
    upsert: false,
  });
  if (up.error) {
    console.error("[anuncios] falha ao enviar a imagem", up.error);
    return { error: "Não foi possível enviar a imagem agora. Tente de novo." };
  }

  const { error } = await db.from("ads").insert({
    id,
    advertiser: parsed.value.advertiser,
    contact_email: parsed.value.email,
    title: parsed.value.title,
    body: parsed.value.body,
    url: parsed.value.urlNormalized,
    image_path: path,
    duration_days: parsed.value.duration,
    amount_cents: amount,
  });
  if (error) {
    console.error("[anuncios] falha ao registrar o pedido", error);
    await admin.storage.from("ads").remove([path]);
    return { error: "Não foi possível registrar o pedido. Tente de novo." };
  }

  redirect(`/anuncie/pedido/${id}`);
}

async function loadPayableAd(id: string): Promise<AdRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await untyped(createAdminClient()).from("ads").select("*").eq("id", id).maybeSingle();
  const ad = data as AdRow | null;
  return ad && ad.status === "awaiting_payment" ? ad : null;
}

export interface AdPixState {
  error: string | null;
  pix: PixView | null;
}

/** Gera o Pix do anúncio na própria página. */
export async function startAdPixAction(adId: string, attempt: number): Promise<AdPixState> {
  const ad = await loadPayableAd(adId);
  if (!ad) return { error: "Este pedido não está mais aguardando pagamento.", pix: null };
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { error: "Pagamento indisponível no momento.", pix: null };
  try {
    const charge = await createPixCharge({
      accessToken: token,
      amountCents: ad.amount_cents,
      description: `Anúncio no TenhaVoz (${ad.duration_days} dias)`,
      externalReference: adRef(ad.id),
      payerEmail: ad.contact_email,
      notificationUrl: `${SITE_URL}/api/webhooks/mercadopago`,
      metadata: { ad_id: ad.id },
      idempotencyKey: `ad-${ad.id}-${attempt}`,
    });
    return { error: null, pix: toPixView(charge) };
  } catch (err) {
    console.error("[anuncios] falha ao gerar o Pix", err);
    return { error: "Não conseguimos gerar o Pix agora. Nada foi cobrado. Tente de novo.", pix: null };
  }
}

/** Alternativa: cartão ou outros meios na tela segura do Mercado Pago. */
export async function startAdCardAction(formData: FormData): Promise<void> {
  const ad = await loadPayableAd(String(formData.get("adId") ?? ""));
  if (!ad) redirect("/anuncie");
  let url: string | undefined;
  try {
    const pref = await getMercadoPagoPreferenceClient().create({
      body: {
        items: [{ id: ad.id, title: `Anúncio no TenhaVoz (${ad.duration_days} dias)`, quantity: 1, unit_price: ad.amount_cents / 100, currency_id: "BRL" }],
        external_reference: adRef(ad.id),
        payer: { email: ad.contact_email },
        back_urls: {
          success: `${SITE_URL}/anuncie/pedido/${ad.id}`,
          pending: `${SITE_URL}/anuncie/pedido/${ad.id}`,
          failure: `${SITE_URL}/anuncie/pedido/${ad.id}`,
        },
        auto_return: "approved",
        notification_url: `${SITE_URL}/api/webhooks/mercadopago`,
      },
    });
    url = pref.init_point;
  } catch (err) {
    console.error("[anuncios] falha ao abrir o pagamento por cartão", err);
  }
  if (!url) redirect(`/anuncie/pedido/${ad.id}?erro=1`);
  redirect(url);
}
