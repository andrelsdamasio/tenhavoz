import Link from "next/link";
import Logo from "@/components/Logo";
import { buildWhatsAppSupportUrl } from "@/lib/support";

export const metadata = {
  title: "Segurança e confiança — TenhaVoz",
  description: "Como o TenhaVoz cuida do seu dinheiro e dos seus dados, e como reconhecer e denunciar golpes.",
};

const BLOCKS: { title: string; items: string[] }[] = [
  {
    title: "Se você vai criar uma campanha",
    items: [
      "A campanha de e-mail tem pagamento único, por Pix ou cartão, e a página só abre depois que o pagamento é confirmado. Criar uma arrecadação é grátis, e o TenhaVoz fica com 4% de cada doação recebida.",
      "Para receber doações você conecta a sua conta do Mercado Pago na página oficial deles. O TenhaVoz nunca vê a sua senha.",
      "O dinheiro cai direto na sua conta do Mercado Pago. O TenhaVoz não segura nem repassa o valor.",
      "Você escolhe o que mostrar: história, meta, prazo e para que o dinheiro será usado. Quem detalha o orçamento transmite mais confiança.",
      "Você acompanha tudo pelo seu painel e pode encerrar a arrecadação quando quiser.",
    ],
  },
  {
    title: "Se você vai doar",
    items: [
      "O pagamento acontece dentro do Mercado Pago. O TenhaVoz não vê os dados do seu cartão.",
      "A doação vai direto para a conta de quem criou a campanha.",
      "Você recebe um comprovante por e-mail e um aviso quando a campanha terminar, com o total arrecadado.",
      "Cada página mostra a meta, quanto já foi arrecadado, quem ajudou (se a pessoa não escolheu ficar anônima) e o orçamento informado.",
    ],
  },
  {
    title: "Sinais de golpe",
    items: [
      "Pedido de Pix ou transferência fora da página da campanha.",
      "Pressa exagerada: “só hoje”, “última chance”.",
      "Campanha sem história clara, sem meta ou sem explicar para que o dinheiro será usado.",
      "Alguém dizendo ser do TenhaVoz e pedindo senha, código ou dados do cartão. Nós nunca pedimos isso.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <main className="tv-app min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="TenhaVoz, página inicial" className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-ink" />
            <span className="display text-2xl">TenhaVoz</span>
          </Link>
          <Link href="/" className="text-sm font-semibold underline underline-offset-4">Voltar ao início</Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="display text-5xl sm:text-6xl">Segurança e confiança</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Pedir ajuda pela internet exige confiança dos dois lados. Aqui está, sem enrolação, como o TenhaVoz funciona.
        </p>
        <div className="mt-8 space-y-6">
          {BLOCKS.map((b) => (
            <section key={b.title} className="rounded-md border-2 border-ink/80 bg-white p-5">
              <h2 className="text-xl font-extrabold">{b.title}</h2>
              <ul className="mt-3 space-y-2">
                {b.items.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden="true" className="mt-0.5 font-extrabold text-folha">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <section className="mt-8 rounded-md bg-sol p-5">
          <h2 className="text-xl font-extrabold">Viu algo estranho?</h2>
          <p className="mt-2">
            Todas as páginas de arrecadação têm o botão “Denunciar esta campanha”. Analisamos e podemos suspender a campanha. Você também pode falar direto com a gente.
          </p>
          <a
            href={buildWhatsAppSupportUrl(null)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-full bg-ink px-5 py-2.5 font-bold text-paper hover:bg-brand-600"
          >
            Falar com o suporte no WhatsApp
          </a>
        </section>
        <p className="mt-8 text-sm text-ink-soft">
          Veja também a <Link href="/privacidade" className="underline underline-offset-4">Política de Privacidade</Link> e os <Link href="/termos" className="underline underline-offset-4">Termos de Uso</Link>.
        </p>
      </div>
    </main>
  );
}
