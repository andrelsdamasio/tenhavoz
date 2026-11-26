import Link from "next/link";
import { buildReportUrl } from "@/lib/support";

/**
 * Painel de confiança da página de arrecadação: só afirma o que o próprio
 * sistema garante (o pagamento é do Mercado Pago, o dinheiro não passa por nós)
 * e mostra o que a campanha informou (orçamento, data).
 */
export default function TrustBox({
  url,
  title,
  publishedAt,
  hasBudget,
}: {
  url: string;
  title: string;
  publishedAt: string | null;
  hasBudget: boolean;
}) {
  const since = publishedAt
    ? new Date(publishedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" })
    : null;
  const items = [
    "O pagamento é feito dentro do Mercado Pago. O TenhaVoz nunca vê os dados do seu cartão.",
    "A doação vai direto para a conta de quem criou a campanha. O TenhaVoz não guarda o dinheiro.",
    hasBudget ? "A campanha mostra para que o dinheiro será usado (veja o orçamento acima)." : "Esta campanha ainda não detalhou o orçamento. Pergunte antes de doar, se tiver dúvida.",
    ...(since ? [`Campanha publicada em ${since}.`] : []),
    "Você recebe um comprovante por e-mail e é avisado quando a campanha terminar.",
  ];
  return (
    <section aria-labelledby="trust-title" className="tv-app border-t-2 border-ink bg-paper px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 id="trust-title" className="display text-3xl">Doar com segurança</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink">
          {items.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="mt-0.5 font-extrabold text-folha">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          Nunca doe por Pix ou transferência fora desta página, e desconfie de quem pede urgência.{" "}
          <Link href="/seguranca" className="font-semibold text-ink underline underline-offset-4">Como evitar golpes</Link>
          {" · "}
          <a href={buildReportUrl(url, title)} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4">
            Denunciar esta campanha
          </a>
        </p>
      </div>
    </section>
  );
}
