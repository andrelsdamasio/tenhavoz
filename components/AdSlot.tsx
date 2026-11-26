import type { Ad } from "@/lib/ad";

/** Anúncio simples, sempre rotulado. Links patrocinados não passam autoridade nem identidade da página. */
export default function AdSlot({ ad }: { ad: Ad | null }) {
  if (!ad) return null;
  return (
    <aside aria-label="Publicidade" className="rounded-md border-2 border-dashed border-ink/50 bg-paper-deep/60 p-4 text-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">Publicidade · {ad.advertiser}</p>
      <p className="mt-1 text-base font-extrabold">{ad.title}</p>
      <p className="mt-0.5 text-ink-soft">{ad.text}</p>
      <a
        href={ad.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="mt-2 inline-block font-semibold underline underline-offset-4"
      >
        Saiba mais
      </a>
    </aside>
  );
}
