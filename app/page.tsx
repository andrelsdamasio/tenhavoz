import Link from "next/link";
import HomeAuthLinks from "@/components/HomeAuthLinks";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { isFundraisingEnabled } from "@/lib/fundraisers";
import { listActiveFundraisers } from "@/lib/fundraiser-public";
import { ActiveFundraisers, FundraisingExplainer, TrustStrip, TwoPathsSection } from "@/components/FundraisingHomeSections";

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
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Cartaz de rua: o que quem apoia vê, e o e-mail que abre na sequência. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md pb-4" aria-hidden="true">
      <div className="absolute -left-3 top-6 h-[88%] w-[92%] rotate-[-6deg] rounded-md bg-sol" />
      <div className="relative rotate-[2deg] rounded-md border-2 border-ink bg-paper p-6 shadow-2xl shadow-ink/20">
        <div className="paper-grain pointer-events-none absolute inset-0 rounded-md" />
        <div className="relative">
          <div className="flex h-10 items-end gap-1.5">
            {[0.5, 0.9, 0.65, 1, 0.45, 0.8, 0.6].map((h, i) => (
              <span
                key={i}
                className="voice-bar w-2.5 rounded-full bg-brand-600"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <p className="display mt-4 text-5xl text-ink">
            Mais segurança na nossa rua
          </p>
          <p className="mt-4 text-sm font-medium text-ink-soft">
            Um clique abre o e-mail pronto para quem decide.
          </p>
          <div className="mt-5 rounded-full bg-ink py-3 text-center text-sm font-bold text-paper">
            Enviar e-mail agora
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-soft">tenhavoz.com.br/sua-causa</p>
        </div>
      </div>

      <div className="relative -mt-4 ml-auto mr-0 w-60 rotate-[-3deg] rounded-md border-2 border-ink bg-white p-4 shadow-xl shadow-ink/15 sm:-mr-6">
        <p className="text-[11px] font-semibold text-ink-soft">Seu app de e-mail abre assim:</p>
        <p className="mt-1.5 text-xs text-ink-soft">
          <span className="font-bold text-ink">Para:</span> vereadores (já preenchido)
        </p>
        <p className="text-xs text-ink-soft">
          <span className="font-bold text-ink">Assunto:</span> Mais segurança na nossa rua
        </p>
        <p className="mt-2 text-right text-xs font-bold text-brand-700">Enviar →</p>
      </div>
    </div>
  );
}

const CAUSES = ["Moradores", "Sindicatos", "Coletivos", "Estudantes", "Associações", "ONGs", "Bairros", "Categorias"];

/** Faixa de palavras entre o topo e o resto: quem usa a voz coletiva. */
function CauseBand() {
  const row = CAUSES.map((c) => (
    <span key={c} className="flex items-center gap-8">
      <span className="display text-3xl text-sol sm:text-4xl">{c}</span>
      <span className="h-3 w-3 rotate-45 bg-brand-500" />
    </span>
  ));
  return (
    <div className="relative overflow-hidden border-y-2 border-ink bg-ink py-4" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-8 pr-8">
        {row}
        {row}
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

  let fundraisingOn = false;
  let activeFundraisers: Awaited<ReturnType<typeof listActiveFundraisers>> = [];
  try {
    const admin = createAdminClient();
    fundraisingOn = await isFundraisingEnabled(admin);
    if (fundraisingOn) activeFundraisers = await listActiveFundraisers(admin);
  } catch {
    fundraisingOn = false;
  }

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
    <main className="paper-grain relative overflow-hidden bg-paper">
      <WhatsNew entries={entriesFor(false)} popupOnly />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-ink" />
            <span className="display text-2xl text-ink">TenhaVoz</span>
          </Link>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm font-semibold text-ink md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="underline-offset-4 hover:underline">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <HomeAuthLinks variant="header" />
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <div>
          {fundraisingOn ? (
            <h1 className="display animate-fade-in-up text-6xl text-ink sm:text-7xl lg:text-[5.5rem]">
              Dê voz à sua causa:{" "}
              <span className="inline-block -rotate-1 bg-sol px-2">mobilize</span> ou{" "}
              <span className="inline-block rotate-1 bg-brand-600 px-2 text-paper">arrecade</span>
            </h1>
          ) : (
            <h1 className="display animate-fade-in-up text-6xl text-ink sm:text-7xl lg:text-[5.5rem]">
              Sua causa vira centenas de e&#8209;mails em{" "}
              <span className="inline-block -rotate-1 bg-sol px-2">um clique</span>
            </h1>
          )}
          <p
            className="animate-fade-in-up mt-6 max-w-xl text-lg font-medium text-ink-soft"
            style={{ animationDelay: "0.12s" }}
          >
            {fundraisingOn
              ? "Para causas, bairros, sindicatos e coletivos. Crie uma campanha de e-mail para pressionar quem decide, ou uma campanha de arrecadação com transparência. O dinheiro vai direto para a sua conta."
              : "Para causas, bairros, sindicatos e coletivos. Crie uma página com o seu manifesto e um botão que abre o e-mail já escrito e endereçado. É só compartilhar o link e quem apoia envia em segundos."}
          </p>

          <div
            className="animate-fade-in-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.22s" }}
          >
            <Link
              href="/signup"
              className="rounded-full bg-brand-600 px-7 py-3.5 font-bold text-paper shadow-lg shadow-brand-600/25 hover:bg-brand-700"
            >
              {fundraisingOn ? "Campanha de e-mail" : "Criar minha campanha"}
            </Link>
            {fundraisingOn && (
              <Link
                href="/dashboard/doacoes/new"
                className="rounded-full bg-ink px-7 py-3.5 font-bold text-paper hover:bg-folha"
              >
                Campanha de arrecadação
              </Link>
            )}
            <a
              href="#como-funciona"
              className="rounded-full border-2 border-ink px-6 py-3 font-bold text-ink hover:bg-ink hover:text-paper"
            >
              Ver como funciona
            </a>
          </div>

          <ul
            className="animate-fade-in-up mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink"
            style={{ animationDelay: "0.3s" }}
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

        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <HeroVisual />
        </div>
      </section>

      <CauseBand />

      {fundraisingOn && <TrustStrip />}
      {fundraisingOn && <ActiveFundraisers items={activeFundraisers} />}
      {fundraisingOn && <TwoPathsSection />}

      <section id="como-funciona" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="display text-5xl text-ink sm:text-6xl">Do rascunho ao link em 3 passos</h2>
          <p className="mt-3 max-w-xl text-lg font-medium text-ink-soft">
            Sem site, sem formulário, sem complicação.
          </p>
        </Reveal>
        <ol className="mt-12 grid gap-10 border-t-2 border-ink pt-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.number}>
              <Reveal>
                <p className="display text-8xl text-brand-600" aria-hidden="true">
                  {step.number}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-ink">{step.title}</h3>
                <p className="mt-2 text-ink-soft">{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative bg-ink py-20 text-paper" aria-labelledby="beneficios">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 id="beneficios" className="display max-w-3xl text-5xl sm:text-6xl">
              Feito para mobilizar <span className="text-sol">de verdade</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <Reveal key={b.title}>
                <div className="border-t border-paper/30 pt-5">
                  <h3 className="flex items-start gap-2.5 text-lg font-extrabold">
                    <span className="text-sol">
                      <Check />
                    </span>
                    {b.title}
                  </h3>
                  <p className="mt-1.5 pl-[26px] text-paper/75">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {fundraisingOn && <FundraisingExplainer />}

      <div id="temas" className="relative scroll-mt-20 pt-20">
        <ThemeShowcase enabled={enabledTemplates} />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="para-quem">
        <Reveal>
          <h2 id="para-quem" className="display text-5xl text-ink sm:text-6xl">
            Para quem é o TenhaVoz
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-x-12 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <Reveal key={u.title}>
              <div className="border-t-2 border-ink py-6">
                <h3 className="text-xl font-extrabold text-ink">{u.title}</h3>
                <p className="mt-1.5 text-ink-soft">{u.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="precos" className="relative scroll-mt-20 border-y-2 border-ink bg-paper-deep py-20" aria-labelledby="precos-titulo">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 id="precos-titulo" className="display text-5xl text-ink sm:text-6xl">
              Preço simples, sem mensalidade
            </h2>
            <p className="mt-3 max-w-xl text-lg font-medium text-ink-soft">
              Você paga uma vez por campanha e escolhe por quanto tempo ela fica no ar.
            </p>
          </Reveal>
          <div className="mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
            {[
              { name: "72 horas", price: price72hCents, note: "Ideal para uma mobilização rápida", highlight: false },
              { name: "7 dias", price: price7dCents, note: "Mais tempo para a campanha circular", highlight: true },
            ].map((plan) => (
              <Reveal key={plan.name}>
                <div
                  className={`h-full rounded-xl border-2 border-ink p-7 ${
                    plan.highlight ? "bg-sol" : "bg-paper"
                  }`}
                >
                  <p className="text-sm font-extrabold uppercase tracking-wide text-ink">{plan.name} no ar</p>
                  <p className="display mt-2 text-7xl text-ink">{formatBRL(plan.price)}</p>
                  <p className="mt-2 font-medium text-ink-soft">{plan.note}</p>
                  <ul className="mt-5 space-y-2 text-sm font-medium text-ink">
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
                    className={`mt-6 block rounded-full px-5 py-3 text-center font-bold ${
                      plan.highlight
                        ? "bg-ink text-paper hover:bg-brand-600"
                        : "border-2 border-ink text-ink hover:bg-ink hover:text-paper"
                    }`}
                  >
                    Criar campanha
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm font-medium text-ink-soft">
            Tem um cupom de desconto? Você informa na hora do pagamento.
          </p>
        </div>
      </section>

      <section id="perguntas" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6" aria-labelledby="faq-titulo">
        <Reveal>
          <h2 id="faq-titulo" className="display text-5xl text-ink sm:text-6xl">
            Perguntas frequentes
          </h2>
        </Reveal>
        <div className="mt-8 max-w-3xl divide-y-2 divide-ink border-y-2 border-ink">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold text-ink">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-3xl font-black leading-none text-brand-600 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative bg-brand-600 py-20 text-paper">
        <Reveal>
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="display text-6xl sm:text-7xl">Pronto para dar voz à sua causa?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-paper/90">
              Crie sua campanha agora. Em poucos minutos o seu link está no ar, pronto para ser compartilhado.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-full bg-ink px-9 py-4 text-lg font-bold text-paper hover:bg-paper hover:text-ink"
            >
              Criar minha campanha
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative bg-ink pb-24 pt-10 text-paper/70 sm:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2 text-paper">
            <Logo className="h-6 w-6 text-brand-500" />
            <span className="display text-xl">TenhaVoz</span>
          </div>
          <div className="flex gap-5 text-sm font-medium">
            <Link href="/seguranca" className="underline-offset-4 hover:underline">
              Segurança
            </Link>
            <Link href="/privacidade" className="underline-offset-4 hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="underline-offset-4 hover:underline">
              Termos
            </Link>
            <HomeAuthLinks variant="footer" />
          </div>
        </div>
      </footer>

      <WhatsAppSupportButton />
    </main>
  );
}
