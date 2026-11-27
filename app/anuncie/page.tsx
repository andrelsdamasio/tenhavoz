import type { Metadata } from "next";
import Link from "next/link";
import AdOrderForm from "@/components/AdOrderForm";
import Logo from "@/components/Logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { readAdPrices } from "@/lib/ad-orders";

export const metadata: Metadata = {
  title: "Anuncie no TenhaVoz",
  description: "Coloque seu anúncio nas páginas de campanhas e doações do TenhaVoz. Pague por Pix e escolha o período.",
};

export const dynamic = "force-dynamic";

export default async function AnunciePage() {
  const prices = await readAdPrices(createAdminClient());
  return (
    <div className="tv-app min-h-screen">
      <header className="border-b-2 border-ink bg-paper">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Link href="/" aria-label="TenhaVoz, página inicial" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-ink" />
            <span className="display text-2xl">TenhaVoz</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="display text-4xl sm:text-5xl">Anuncie aqui</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Seu anúncio aparece no fim das páginas de campanhas e de doações, onde as pessoas já estão engajadas com uma causa. Sem conta, sem
          complicação: preencha, envie a imagem, pague por Pix e a gente confere e coloca no ar.
        </p>
        <ol className="my-6 grid gap-3 text-sm sm:grid-cols-3">
          {["Preencha e envie a imagem", "Pague por Pix, direto na página", "Conferimos e publicamos em até 1 dia útil"].map((t, i) => (
            <li key={t} className="flex items-center gap-3 rounded-md border-2 border-ink/15 bg-white p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sol text-xs font-extrabold">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <AdOrderForm price7={prices.ad_price_7d_cents} price30={prices.ad_price_30d_cents} />
      </main>
    </div>
  );
}
