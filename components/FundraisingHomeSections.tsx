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
    <section id="dois-caminhos" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
      <Reveal>
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">O que você quer fazer?</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">Escolha o caminho. Os dois são simples.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2">
        <Reveal>
          <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Mobilizar</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">Campanha de e-mail</h3>
            <p className="mt-2 flex-1 text-sm text-gray-600">
              Uma página com o seu manifesto e um botão que abre o e-mail já escrito e endereçado. Quem apoia envia em
              segundos.
            </p>
            <Link
              href="/signup"
              className="mt-5 block rounded-full bg-brand-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
            >
              Criar campanha de e-mail
            </Link>
          </div>
        </Reveal>
        <Reveal>
          <div className="flex h-full flex-col rounded-2xl border-2 border-brand-600 bg-brand-50 p-6 shadow-lg shadow-brand-600/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Arrecadar</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">Campanha de arrecadação</h3>
            <p className="mt-2 flex-1 text-sm text-gray-700">
              Uma vaquinha com meta, prazo e orçamento detalhado. O dinheiro vai direto para a sua conta do Mercado Pago,
              sem taxa para abrir a campanha.
            </p>
            <Link
              href="/dashboard/doacoes/new"
              className="mt-5 block rounded-full bg-brand-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
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
    <section id="doacoes" className="relative border-y border-gray-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Arrecadação: como funciona</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
            Você fica com o que arrecadar (a meta é flexível). Cobramos só 4% de cada doação e o doador pode, se quiser,
            contribuir com o TenhaVoz. Não existe taxa de abertura.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DONATION_STEPS.map((s, i) => (
            <Reveal key={s.title}>
              <div className="h-full rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ActiveFundraisers({ items }: { items: ActiveFundraiserCard[] }) {
  if (items.length === 0) return null;
  return (
    <section id="campanhas-ativas" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <Reveal>
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Campanhas de arrecadação no ar</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">Veja o orçamento de cada uma e ajude quem precisa.</p>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {items.map((f) => {
          const pct = progressPercent(f.raisedCents, f.goalCents);
          return (
            <Reveal key={f.slug}>
              <Link
                href={`/d/${f.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {f.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.coverImageUrl} alt="" className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-2 bg-brand-600" aria-hidden="true" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-2 font-semibold text-gray-900">{f.title}</h3>
                  {f.beneficiaryName && <p className="mt-0.5 text-xs text-gray-500">Para {f.beneficiaryName}</p>}
                  {f.summary && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{f.summary}</p>}
                  <div className="mt-auto pt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-gray-900">{formatCentsBRL(f.raisedCents)}</span>
                      <span className="text-gray-500">{pct}% de {formatCentsBRL(f.goalCents)}</span>
                    </div>
                    {f.daysLeft !== null && (
                      <p className="mt-1 text-xs text-gray-500">{f.daysLeft === 1 ? "Falta 1 dia" : `Faltam ${f.daysLeft} dias`}</p>
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
    <section aria-label="Por que confiar" className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TRUST.map((t) => (
          <li key={t.title} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">{t.title}</p>
            <p className="mt-1 text-xs text-gray-600 sm:text-sm">{t.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
