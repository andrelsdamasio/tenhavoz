import Link from "next/link";

const COPY = {
  email: [
    "O pagamento é único por campanha, por Pix ou cartão. A página só abre depois que o pagamento é confirmado.",
    "Quem apoia não cria conta, e o TenhaVoz não envia nada em nome de ninguém nem guarda o e-mail de quem participa.",
    "A página fica no ar por 72 horas ou 7 dias, como você escolher. Avisamos antes de acabar, e dá para renovar.",
  ],
  fundraiser: [
    "As doações caem direto na sua conta do Mercado Pago. O TenhaVoz não segura o dinheiro.",
    "Nunca vemos sua senha: você autoriza na página oficial do Mercado Pago e pode revogar quando quiser.",
    "Cada doador recebe comprovante por e-mail. Seus doadores veem a meta, o quanto foi arrecadado e o seu orçamento.",
  ],
} as const;

/** Lembrete curto de segurança nas telas de criação: tira a dúvida "será que é golpe?". */
export default function TrustNote({ kind }: { kind: keyof typeof COPY }) {
  return (
    <aside aria-label="Segurança" className="rounded-md border-2 border-ink/80 bg-white p-4 text-sm">
      <p className="font-extrabold">Seguro e transparente</p>
      <ul className="mt-2 space-y-1.5 text-ink-soft">
        {COPY[kind].map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden="true" className="font-extrabold text-folha">✓</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <Link href="/seguranca" className="mt-3 inline-block font-semibold underline underline-offset-4">
        Entenda como o TenhaVoz funciona
      </Link>
    </aside>
  );
}
