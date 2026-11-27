import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { DisplayAd } from "@/lib/ad-orders";

/**
 * Espaço de publicidade, sempre rotulado. Com anúncio: imagem + texto + link
 * patrocinado (não passa autoridade). Sem anúncio e `showEmpty`: convite
 * "Anuncie aqui" que leva à página de compra.
 */
export default function AdSlot({ ad, showEmpty = false }: { ad: DisplayAd | null; showEmpty?: boolean }) {
  if (!ad) {
    if (!showEmpty) return null;
    return (
      <aside aria-label="Espaço para anúncio" className="rounded-md border-2 border-dashed border-ink/50 bg-paper-deep/60 p-5 text-center">
        <Megaphone aria-hidden="true" className="mx-auto h-6 w-6 text-brand-600" />
        <p className="display mt-1 text-2xl">Anuncie aqui</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
          Mostre seu negócio ou sua causa para quem apoia campanhas no TenhaVoz. Você envia a imagem, paga por Pix e escolhe por quanto tempo fica no ar.
        </p>
        <Link href="/anuncie" className="mt-3 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          Quero anunciar
        </Link>
      </aside>
    );
  }
  return (
    <aside aria-label="Publicidade" className="overflow-hidden rounded-md border-2 border-ink/60 bg-white text-sm">
      {ad.imageUrl && (
        <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageUrl} alt={ad.title} width={1200} height={628} loading="lazy" className="aspect-[1200/628] w-full bg-paper-deep object-cover" />
        </a>
      )}
      <div className="p-4">
        <p className="flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
          <span>Publicidade · {ad.advertiser}</span>
          <Link href="/anuncie" className="normal-case tracking-normal underline underline-offset-4">Anuncie aqui</Link>
        </p>
        <p className="mt-1 text-base font-extrabold">{ad.title}</p>
        <p className="mt-0.5 text-ink-soft">{ad.text}</p>
        <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" className="mt-2 inline-block font-semibold underline underline-offset-4">
          Saiba mais
        </a>
      </div>
    </aside>
  );
}
