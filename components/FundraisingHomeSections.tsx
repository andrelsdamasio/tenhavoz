import Link from "next/link";
import Reveal from "@/components/Reveal";
import { formatCentsBRL } from "@/lib/fundraisers";
import { progressPercent, type ActiveFundraiserCard } from "@/lib/fundraiser-public";

const DONATION_STEPS = [
  { title: "Conte sua história", text: "Descreva a causa e a meta. A IA ajuda a escrever o texto, se você quiser." },
  { title: "Mostre para que será o dinheiro", text: "Liste item por item o que será pago. Quem doa confia mais." },
  { title: "Conecte o Mercado Pago", text: "A doação cai direto na sua conta. O dinheiro nunca passa pelo TenhaVoz." },
  { title: "Compartilhe e acompanhe", text: "Divulgue o link, veja a barra de progresso subir e agradeça a quem ajudou." },
];

/** Dois caminhos logo abaixo do topo: campanha de e-mail ou campanha de arrecadação. */
export function TwoPathsSection() {
  return (
    <section id="dois-caminhos" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal>
        <h2 className="display text-5xl text-ink sm:text-6xl">O que você quer fazer?</h2>
        <p className="mt-3 max-w-xl text-lg font-medium text-ink-soft">Escolha o caminho. Os dois são simples.</p>
      </Reveal>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Reveal>
          <div className="flex h-full flex-col rounded-xl border-2 border-ink bg-sol p-7">
            <h3 className="display text-4xl text-ink">Mobilizar: campanha de e-mail</h3>
            <p className="mt-3 flex-1 font-medium text-ink">
              Uma página com o seu manifesto e um botão que abre o e-mail já escrito e endereçado. Quem apoia envia em
              segundos.
            </p>
            <Link
              href="/signup"
              className="mt-6 block rounded-full bg-ink px-5 py-3 text-center font-bold text-paper hover:bg-brand-600"
            >
              Criar campanha de e-mail
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex h-full flex-col rounded-xl border-2 border-ink bg-folha p-7 text-paper">
            <h3 className="display text-4xl">Arrecadar: campanha de arrecadação</h3>
            <p className="mt-3 flex-1 font-medium text-paper/90">
              Uma vaquinha com meta, prazo e orçamento detalhado. O dinheiro vai direto para a sua conta do Mercado Pago,
              sem taxa para abrir a campanha.
            </p>
            <Link
              href="/dashboard/doacoes/new"
              className="mt-6 block rounded-full bg-paper px-5 py-3 text-center font-bold text-ink hover:bg-sol"
            >
              Criar campanha de arrecadação
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FundraisingExplainer() {
  return (
    <section id="doacoes" className="relative border-y-2 border-ink bg-folha-light py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="display text-5xl text-folha sm:text-6xl">Arrecadação: como funciona</h2>
          <p className="mt-3 max-w-2xl text-lg font-medium text-ink-soft">
            Você fica com o que arrecadar (a meta é flexível). Cobramos só 4% de cada doação e o doador pode, se quiser,
            contribuir com o TenhaVoz. Não existe taxa de abertura.
          </p>
        </Reveal>
        <ol className="mt-12 grid gap-x-8 gap-y-10 border-t-2 border-folha pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {DONATION_STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal>
                <p className="display text-7xl text-folha" aria-hidden="true">
                  {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-ink-soft">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ActiveFundraisers({ items }: { items: ActiveFundraiserCard[] }) {
  if (items.length === 0) return null;
  return (
    <section id="campanhas-ativas" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <Reveal>
        <h2 className="display text-5xl text-ink sm:text-6xl">Campanhas de arrecadação no ar</h2>
        <p className="mt-3 max-w-xl text-lg font-medium text-ink-soft">Veja o orçamento de cada uma e ajude quem precisa.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {items.map((f) => {
          const pct = progressPercent(f.raisedCents, f.goalCents);
          return (
            <Reveal key={f.slug}>
              <Link
                href={`/d/${f.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border-2 border-ink bg-paper transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/15"
              >
                {f.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.coverImageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-3 bg-sol" aria-hidden="true" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 font-extrabold text-ink">{f.title}</h3>
                  {f.beneficiaryName && <p className="mt-0.5 text-xs font-medium text-ink-soft">Para {f.beneficiaryName}</p>}
                  {f.summary && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{f.summary}</p>}
                  <div className="mt-auto pt-4">
                    <div className="h-2 overflow-hidden rounded-full border border-ink bg-paper-deep" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-folha" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-sm">
                      <span className="font-extrabold text-ink">{formatCentsBRL(f.raisedCents)}</span>
                      <span className="text-ink-soft">{pct}% de {formatCentsBRL(f.goalCents)}</span>
                    </div>
                    {f.daysLeft !== null && (
                      <p className="mt-1 text-xs font-medium text-ink-soft">{f.daysLeft === 1 ? "Falta 1 dia" : `Faltam ${f.daysLeft} dias`}</p>
                    )}
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const TRUST = [
  { title: "Direto na sua conta", text: "O dinheiro cai no seu Mercado Pago. Nunca passa pelo TenhaVoz." },
  { title: "Sem taxa para abrir", text: "Só 4% de cada doação recebida. Sem mensalidade." },
  { title: "Orçamento à vista", text: "Cada campanha mostra para que o dinheiro será usado." },
  { title: "Fique com o que arrecadar", text: "Meta flexível: você recebe tudo, mesmo sem bater a meta." },
];

/** Faixa de confiança logo abaixo do topo, como nos sites de vaquinha. */
export function TrustStrip() {
  return (
    <section aria-label="Por que confiar" className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-6 border-b-2 border-ink pb-10 lg:grid-cols-4">
        {TRUST.map((t) => (
          <li key={t.title} className="border-t-2 border-ink pt-3">
            <p className="text-base font-extrabold text-ink">{t.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{t.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
