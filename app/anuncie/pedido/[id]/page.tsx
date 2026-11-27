import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdPayment from "@/components/AdPayment";
import AdSlot from "@/components/AdSlot";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { AD_STATUS_LABEL, adImageUrl, untyped, type AdRow } from "@/lib/ad-orders";
import { reconcileAdPayment } from "@/lib/ad-payments";
import { formatBRL } from "@/lib/pricing";

export const metadata: Metadata = { title: "Seu pedido de anúncio", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const read = async () => (await untyped(admin).from("ads").select("*").eq("id", id).maybeSingle()).data as AdRow | null;
  let ad = await read();
  if (!ad) notFound();
  if (ad.status === "awaiting_payment") {
    await reconcileAdPayment(admin, id);
    ad = (await read()) ?? ad;
  }

  const lines = [
    { label: "Anúncio", value: ad.title },
    { label: "Período", value: `${ad.duration_days} dias` },
    { label: "Situação", value: AD_STATUS_LABEL[ad.status] },
  ];
  const total = formatBRL(ad.amount_cents);
  const perks = ["Imagem, título, texto e link", "Aparece em campanhas e doações", "Conferido antes de ir ao ar", "Se não puder ser publicado, devolvemos tudo"];
  const preview = { advertiser: ad.advertiser, title: ad.title, text: ad.body, url: ad.url, imageUrl: adImageUrl(ad.image_path) };

  if (ad.status === "awaiting_payment") {
    return (
      <CheckoutShell step={2} title="Pagamento do anúncio" lines={lines} totalValue={total} perks={perks}>
        <AdPayment adId={ad.id} amountLabel={total} cardError={erro === "1"} />
        <div className="mt-5 border-t-2 border-ink/10 pt-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">Seu anúncio</p>
          <AdSlot ad={preview} />
        </div>
      </CheckoutShell>
    );
  }

  const message: Record<string, { title: string; text: string }> = {
    in_review: { title: "Pagamento recebido. Estamos conferindo.", text: "Em até 1 dia útil o anúncio entra no ar e avisamos por e-mail." },
    live: { title: "Seu anúncio está no ar!", text: ad.ends_at ? `Ele fica visível até ${new Date(ad.ends_at).toLocaleDateString("pt-BR")}.` : "" },
    rejected: { title: "Não conseguimos publicar este anúncio", text: `${ad.reject_reason ?? ""} O valor foi ou será devolvido integralmente.` },
    refunded: { title: "Pagamento devolvido", text: "O valor deste pedido foi devolvido." },
    ended: { title: "Este anúncio já terminou", text: "O período contratado acabou. Quer anunciar de novo?" },
  };
  const m = message[ad.status] ?? { title: "Pedido", text: "" };
  return (
    <CheckoutShell step={3} title="Seu pedido de anúncio" lines={lines} totalValue={total} perks={perks}>
      <h2 className="display text-xl">{m.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{m.text}</p>
      <div className="mt-4"><AdSlot ad={preview} /></div>
      <Link href="/anuncie" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Fazer outro anúncio</Link>
    </CheckoutShell>
  );
}
