import Link from "next/link";
import Logo from "@/components/Logo";
import WhatsNew from "@/components/WhatsNew";
import { entriesFor } from "@/lib/whats-new";
import Reveal from "@/components/Reveal";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import ThemeShowcase from "@/components/ThemeShowcase";
import { createPublicClient } from "@/lib/supabase/public";
import { getAppSettings } from "@/lib/settings";
import { formatBRL } from "@/lib/pricing";
import { BENEFITS, FAQ, USE_CASES } from "@/lib/landing-content";

export const revalidate = 60;

const STEPS = [
  {
    number: 1,
    title: "Escreva sua mensagem",
    text: "Conte a sua causa, informe para quem o e-mail deve ir e escolha um visual. Você vê a página ficar pronta ao lado.",
  },
  {
    number: 2,
    title: "Publique seu link",
    text: "Pague uma vez, por Pix ou cartão, e receba um link só seu, com o botão de envio já configurado.",
  },
  {
    number: 3,
    title: "Compartilhe e acompanhe",
    text: "Divulgue no WhatsApp e nas redes. Cada clique abre o e-mail pronto e você acompanha o alcance no painel.",
  },
];

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#temas", label: "Visuais" },
  { href: "#precos", label: "Preços" },
  { href: "#perguntas", label: "Perguntas" },
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Miniatura do que o apoiador vê: a página da campanha e o e-mail já escrito. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="animate-float rounded-2xl border border-gray-200 bg-white p-5 pb-24 shadow-xl shadow-brand-600/10">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          <span className="ml-2 truncate rounded-full bg-gray-100 px-3 py-0.5 text-[11px] text-gray-500">
            tenhavoz.com.br/sua-causa
          </span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Campanha</p>
        <p className="mt-1 text-lg font-bold leading-snug text-gray-900">Mais segurança na nossa rua</p>
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-full rounded bg-gray-100" />
          <div className="h-2 w-11/12 rounded bg-gray-100" />
          <div className="h-2 w-4/5 rounded bg-gray-100" />
        </div>
        <div className="mt-4 rounded-lg bg-brand-600 py-2.5 text-center text-sm font-semibold text-white">
          Enviar e-mail agora
        </div>
      </div>

      <div className="absolute -bottom-8 -right-2 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:-right-8">
        <p className="text-[11px] text-gray-400">Seu app de e-mail abre assim:</p>
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Para:</span> vereadores (já preenchido)
        </p>
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">Assunto:</span> Mais segurança na nossa rua
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded bg-gray-100" />
          <div className="h-1.5 w-5/6 rounded bg-gray-100" />
        </div>
        <p className="mt-3 text-right text-xs font-semibold text-brand-600">Enviar →</p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const supabase = createPublicClient();
  const {
    price_72h_brl_cents: price72hCents,
    price_7d_brl_cents: price7dCents,
    enabled_templates: enabledTemplates,
  } = await getAppSettings(supabase);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="relative overflow-hidden bg-gray-50">
      <WhatsNew entries={entriesFor(false)} popupOnly />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-200 opacity-40 blur-3xl" />
        <div className="animate-blob absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-brand-300 opacity-30 blur-3xl [animation-delay:4s]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-gray-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-bold tracking-tight">TenhaVoz</span>
          </Link>
          <nav aria-label="Seções" className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-gray-900">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Entrar
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Criar campanha
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-2 lg:pt-20">
        <div className="text-center lg:text-left">
          <p
            className="animate-fade-in-up mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700"
          >
            Para causas, bairros, sindicatos e coletivos
          </p>
          <h1
            className="animate-fade-in-up text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl"
            style={{ animationDelay: "0.1s" }}
          >
            Sua causa vira centenas de e&#8209;mails em{" "}
            <span className="text-brand-600">um clique</span>
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-xl text-lg text-gray-600 lg:mx-0"
            style={{ animationDelay: "0.2s" }}
          >
            Crie uma página com o seu manifesto e um botão que abre o e-mail já escrito e endereçado. É só
            compartilhar o link e quem apoia envia em segundos.
          </p>

          <div
            className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/signup"
              className="rounded-full bg-brand-600 px-7 py-3 font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700 hover:shadow-lg"
            >
              Criar minha campanha
            </Link>
            <a
              href="#como-funciona"
              className="rounded-full border border-gray-300 px-7 py-3 font-medium text-gray-700 transition hover:bg-white"
            >
              Ver como funciona
            </a>
          </div>

          <ul
            className="animate-fade-in-up mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-500 lg:justify-start"
            style={{ animationDelay: "0.4s" }}
          >
            <li className="flex items-center gap-1.5">
              <Check /> A partir de {formatBRL(price72hCents)}, pagamento único
            </li>
            <li className="flex items-center gap-1.5">
              <Check /> Quem apoia não precisa de conta
            </li>
            <li className="flex items-center gap-1.5">
              <Check /> Sem programar
            </li>
          </ul>
        </div>

        <div className="animate-fade-in-up pb-8" style={{ animationDelay: "0.25s" }}>
          <HeroVisual />
        </div>
      </section>

      <section id="como-funciona" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 pb-24">
        <Reveal>
          <h2 className="text-center text-3xl font-bold text-gray-900">Do rascunho ao link em 3 passos</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
            Sem site, sem formulário, sem complicação.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Reveal key={step.number}>
              <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative border-y border-gray-200 bg-white py-20" aria-labelledby="beneficios">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 id="beneficios" className="text-center text-3xl font-bold text-gray-900">
              Feito para mobilizar de verdade
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <Reveal key={b.title}>
                <div className="h-full">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Check />
                  </div>
                  <h3 className="font-semibold text-gray-900">{b.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div id="temas" className="relative scroll-mt-20 pt-20">
        <ThemeShowcase enabled={enabledTemplates} />
      </div>

      <section className="relative mx-auto max-w-6xl px-6 pb-24" aria-labelledby="para-quem">
        <Reveal>
          <h2 id="para-quem" className="text-center text-3xl font-bold text-gray-900">
            Para quem é o TenhaVoz
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <Reveal key={u.title}>
              <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-5">
                <Check />
                <div>
                  <h3 className="font-semibold text-gray-900">{u.title}</h3>
                  <p className="mt-0.5 text-sm text-gray-600">{u.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="precos" className="relative scroll-mt-20 border-y border-gray-200 bg-white py-20" aria-labelledby="precos-titulo">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 id="precos-titulo" className="text-center text-3xl font-bold text-gray-900">
              Preço simples, sem mensalidade
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
              Você paga uma vez por campanha e escolhe por quanto tempo ela fica no ar.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              { name: "72 horas", price: price72hCents, note: "Ideal para uma mobilização rápida", highlight: false },
              { name: "7 dias", price: price7dCents, note: "Mais tempo para a campanha circular", highlight: true },
            ].map((plan) => (
              <Reveal key={plan.name}>
                <div
                  className={`h-full rounded-2xl border p-7 ${
                    plan.highlight
                      ? "border-brand-600 bg-brand-50 shadow-lg shadow-brand-600/10"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-brand-700">{plan.name} no ar</p>
                  <p className="mt-2 text-4xl font-extrabold text-gray-900">{formatBRL(plan.price)}</p>
                  <p className="mt-1 text-sm text-gray-600">{plan.note}</p>
                  <ul className="mt-5 space-y-2 text-sm text-gray-700">
                    {[
                      "Página com seu link e visual à escolha",
                      "Botão que abre o e-mail pronto",
                      "Painel com visitas e cliques",
                      "Edição nas primeiras 24 horas",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check /> {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 block rounded-full px-5 py-2.5 text-center font-semibold transition ${
                      plan.highlight
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "border border-gray-300 text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    Criar campanha
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            Tem um cupom de desconto? Você informa na hora do pagamento.
          </p>
        </div>
      </section>

      <section id="perguntas" className="relative mx-auto max-w-3xl scroll-mt-20 px-6 py-20" aria-labelledby="faq-titulo">
        <Reveal>
          <h2 id="faq-titulo" className="text-center text-3xl font-bold text-gray-900">
            Perguntas frequentes
          </h2>
        </Reveal>
        <div className="mt-8 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {FAQ.map((item) => (
            <details key={item.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-xl leading-none text-brand-600 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-6 pb-24">
        <Reveal>
          <div className="rounded-3xl bg-brand-600 px-8 py-12 text-center text-white shadow-xl shadow-brand-600/20">
            <h2 className="text-3xl font-bold">Pronto para dar voz à sua causa?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Crie sua campanha agora. Em poucos minutos o seu link está no ar, pronto para ser compartilhado.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-block rounded-full bg-white px-8 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Criar minha campanha
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative border-t border-gray-200 bg-white/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
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
            <Link href="/login" className="hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </footer>

      <WhatsAppSupportButton />
    </main>
  );
}
