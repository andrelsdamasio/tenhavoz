import { formatCentsBRL } from "@/lib/fundraisers";

interface Base {
  title: string;
  slug: string;
  amountCents: number;
  siteUrl: string;
}

/** Aviso ao criador: chegou uma doação. O dinheiro já está na conta dele no Mercado Pago. */
export function creatorNoticeEmail(
  input: Base & { donorName: string; message: string | null; raisedCents: number; goalCents: number }
) {
  const pct = input.goalCents > 0 ? Math.min(100, Math.floor((input.raisedCents / input.goalCents) * 100)) : 0;
  const lines = [
    `Você recebeu uma doação de ${formatCentsBRL(input.amountCents)} na campanha "${input.title}".`,
    `De: ${input.donorName}`,
    ...(input.message ? [`Mensagem: "${input.message}"`] : []),
    "",
    `Já foram arrecadados ${formatCentsBRL(input.raisedCents)} (${pct}% da meta de ${formatCentsBRL(input.goalCents)}).`,
    "O valor cai direto na sua conta do Mercado Pago, sem passar pelo TenhaVoz.",
    "",
    `Veja a campanha: ${input.siteUrl}/d/${input.slug}`,
  ];
  return { subject: `Nova doação de ${formatCentsBRL(input.amountCents)} em "${input.title}"`, text: lines.join("\n") };
}

/** Recibo para quem doou. */
export function donorReceiptEmail(input: Base & { donorName: string; tipCents: number }) {
  const total = input.amountCents + input.tipCents;
  const lines = [
    `Olá, ${input.donorName}! Obrigado por ajudar a campanha "${input.title}".`,
    "",
    `Doação para a campanha: ${formatCentsBRL(input.amountCents)}`,
    ...(input.tipCents > 0 ? [`Contribuição voluntária ao TenhaVoz: ${formatCentsBRL(input.tipCents)}`] : []),
    `Total pago: ${formatCentsBRL(total)}`,
    "",
    "O valor da doação foi direto para a conta do responsável pela campanha.",
    `Acompanhe e compartilhe: ${input.siteUrl}/d/${input.slug}`,
  ];
  return { subject: `Recebemos sua doação para "${input.title}"`, text: lines.join("\n") };
}
