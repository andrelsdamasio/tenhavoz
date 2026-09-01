import Link from "next/link";
import Logo from "@/components/Logo";
import { createPublicClient } from "@/lib/supabase/public";
import { getAppSettings } from "@/lib/settings";
import { formatBRL } from "@/lib/pricing";

export const revalidate = 60;

const STEPS = [
  {
    number: 1,
    title: "Crie a campanha",
    text: "Escreva o manifesto, defina os destinatários e escolha um dos templates prontos.",
  },
  {
    number: 2,
    title: "Publique a página",
    text: "Pague uma vez e ganhe uma URL pública com o botão de envio já configurado.",
  },
  {
    number: 3,
    title: "Mobilize pessoas",
    text: "Cada visitante clica e envia o e-mail pelo próprio app dele — você acompanha o alcance no seu painel.",
  },
];

export default async function HomePage() {
  const supabase = createPublicClient();
  const { campaign_price_brl_cents: priceCents } = await getAppSettings(supabase);

  return (
    <main className="relative overflow-hidden bg-gray-50">
      {/* blobs decorativos de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="animate-blob absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-200 opacity-40 blur-3xl" />
        <div className="animate-blob absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-brand-300 opacity-30 blur-3xl [animation-delay:4s]" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-brand-600" />
          <span className="text-lg font-bold tracking-tight">TenhaVoz</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Entrar
        </Link>
      </header>

      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-12 text-center">
        <div className="animate-float animate-fade-in-up mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
          <Logo className="h-9 w-9" />
        </div>

        <h1
          className="animate-fade-in-up text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl"
          style={{ animationDelay: "0.1s" }}
        >
          Tenha seu próprio link on-line totalmente personalizável em simples
          passos
        </h1>
        <ul
          className="animate-fade-in-up mt-6 flex max-w-xl flex-col gap-2 text-lg text-gray-600"
          style={{ animationDelay: "0.2s" }}
        >
          <li>Crie seu próprio link para mobilizar a sua causa</li>
          <li>Multiplique sua campanha apenas disponibilizando seu link</li>
          <li>Com alguns cliques muitos e-mails serão enviados</li>
        </ul>

        <div
          className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.3s" }}
        >
          <Link
            href="/signup"
            className="rounded-full bg-brand-600 px-7 py-3 font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700 hover:shadow-lg"
          >
            Criar minha campanha
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-300 px-7 py-3 font-medium text-gray-700 transition hover:bg-white"
          >
            Já tenho conta
          </Link>
        </div>

        <p
          className="animate-fade-in-up mt-4 text-sm text-gray-400"
          style={{ animationDelay: "0.4s" }}
        >
          A partir de {formatBRL(priceCents)}, pagamento único por campanha.
        </p>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="animate-fade-in-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                {step.number}
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {step.title}
              </h2>
              <p className="text-sm text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-gray-200 bg-white/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-center">
          <div className="flex items-center gap-2 text-gray-500">
            <Logo className="h-4 w-4" />
            <span className="text-sm font-medium">TenhaVoz</span>
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:underline">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
