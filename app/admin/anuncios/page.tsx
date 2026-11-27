import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { AD_STATUS_LABEL, adImageUrl, readAdPrices, untyped, type AdRow } from "@/lib/ad-orders";
import { formatBRL } from "@/lib/pricing";
import { approveAdAction, endAdAction, rejectAdAction, setAdPricesAction } from "./actions";

export const dynamic = "force-dynamic";

const btn = "rounded-md border-2 border-ink px-3 py-1.5 text-sm font-bold hover:bg-paper-deep";

function AdCard({ ad, children }: { ad: AdRow; children?: React.ReactNode }) {
  return (
    <li className="overflow-hidden rounded-md border-2 border-ink bg-white md:grid md:grid-cols-[16rem_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={adImageUrl(ad.image_path)} alt={ad.title} width={1200} height={628} loading="lazy" className="aspect-[1200/628] w-full bg-paper-deep object-cover" />
      <div className="space-y-1 p-4 text-sm">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">
          {ad.advertiser} · {AD_STATUS_LABEL[ad.status]} · {ad.duration_days} dias · {formatBRL(ad.amount_cents)}
        </p>
        <p className="text-base font-extrabold">{ad.title}</p>
        <p className="text-ink-soft">{ad.body}</p>
        <p className="[overflow-wrap:anywhere]">
          <a href={ad.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-4">{ad.url}</a>
        </p>
        <p className="text-xs text-ink-soft">
          {ad.contact_email}
          {ad.ends_at && ad.status === "live" ? ` · no ar até ${new Date(ad.ends_at).toLocaleDateString("pt-BR")}` : ""}
          {ad.reject_reason ? ` · motivo: ${ad.reject_reason}` : ""}
        </p>
        {children}
      </div>
    </li>
  );
}

export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");
  const { ok, erro } = await searchParams;

  const admin = createAdminClient();
  const [{ data }, prices] = await Promise.all([
    untyped(admin).from("ads").select("*").neq("status", "awaiting_payment").order("created_at", { ascending: false }).limit(100),
    readAdPrices(admin),
  ]);
  const ads = (data ?? []) as AdRow[];
  const now = Date.now();
  const live = ads.filter((a) => a.status === "live" && (!a.ends_at || new Date(a.ends_at).getTime() > now));
  const review = ads.filter((a) => a.status === "in_review");
  const rest = ads.filter((a) => !live.includes(a) && !review.includes(a));
  const revenue = ads.filter((a) => a.paid_at && a.status !== "refunded").reduce((t, a) => t + a.amount_cents, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Anúncios" description="Anúncios comprados em /anuncie. Pagou, você confere e aprova; se recusar, o valor é devolvido sozinho." />
      {ok && <p role="status" className="mb-4 rounded-md bg-folha-light p-3 text-sm font-semibold text-folha">{ok}</p>}
      {erro && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

      <section className="mb-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <form action={setAdPricesAction} className="flex flex-wrap items-end gap-3 rounded-md border-2 border-ink bg-white p-4">
          <label className="text-sm font-semibold">Preço 7 dias (R$)
            <input name="price7" defaultValue={(prices.ad_price_7d_cents / 100).toFixed(2).replace(".", ",")} inputMode="decimal" className="mt-1 block w-28 rounded-md border-2 border-ink/30 px-2 py-1.5" />
          </label>
          <label className="text-sm font-semibold">Preço 30 dias (R$)
            <input name="price30" defaultValue={(prices.ad_price_30d_cents / 100).toFixed(2).replace(".", ",")} inputMode="decimal" className="mt-1 block w-28 rounded-md border-2 border-ink/30 px-2 py-1.5" />
          </label>
          <button type="submit" className={btn}>Salvar preços</button>
        </form>
        <div className="rounded-md border-2 border-ink bg-sol/40 p-4 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide"><Megaphone aria-hidden="true" className="h-3.5 w-3.5" /> Vendido em anúncios</p>
          <p className="display text-3xl">{formatBRL(revenue)}</p>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Para aprovar ({review.length})</h2>
      {review.length === 0 ? <p className="mb-6 text-sm text-ink-soft">Nenhum anúncio esperando.</p> : (
        <ul className="mb-6 space-y-3">
          {review.map((ad) => (
            <AdCard key={ad.id} ad={ad}>
              <div className="flex flex-wrap items-end gap-2 pt-2">
                <form action={approveAdAction}>
                  <input type="hidden" name="id" value={ad.id} />
                  <button type="submit" className="rounded-md bg-folha px-3 py-1.5 text-sm font-bold text-white hover:opacity-90">Aprovar e colocar no ar</button>
                </form>
                <form action={rejectAdAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={ad.id} />
                  <input name="reason" maxLength={300} placeholder="Motivo (vai por e-mail)" className="w-56 rounded-md border-2 border-ink/30 px-2 py-1.5 text-sm" />
                  <ConfirmButton label="Recusar e devolver" title="Recusar este anúncio?" description="O valor pago será devolvido a quem anunciou e ele recebe um e-mail com o motivo." confirmLabel="Recusar e devolver" danger className={btn} />
                </form>
              </div>
            </AdCard>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">No ar ({live.length})</h2>
      {live.length === 0 ? <p className="mb-6 text-sm text-ink-soft">Nenhum anúncio pago no ar. As páginas mostram o convite “Anuncie aqui”.</p> : (
        <ul className="mb-6 space-y-3">
          {live.map((ad) => (
            <AdCard key={ad.id} ad={ad}>
              <form action={endAdAction} className="pt-2">
                <input type="hidden" name="id" value={ad.id} />
                <ConfirmButton label="Tirar do ar" title="Tirar este anúncio do ar?" description="Ele deixa de aparecer agora. Não há reembolso automático." confirmLabel="Tirar do ar" danger className={btn} />
              </form>
            </AdCard>
          ))}
        </ul>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Histórico</h2>
          <ul className="space-y-3">{rest.map((ad) => <AdCard key={ad.id} ad={ad} />)}</ul>
        </>
      )}
    </div>
  );
}
