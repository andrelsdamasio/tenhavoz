import { formatCentsBRL } from "@/lib/fundraisers";
import { emailShell } from "@/lib/email-template";

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
  const html = emailShell({
    siteUrl: input.siteUrl,
    heading: `Você recebeu uma doação em "${input.title}"`,
    intro: `${input.donorName}${input.message ? ` deixou a mensagem: “${input.message}”` : " acabou de ajudar a sua campanha."}`,
    highlight: { label: "Valor da doação", value: formatCentsBRL(input.amountCents) },
    rows: [
      { label: "Arrecadado até agora", value: formatCentsBRL(input.raisedCents), strong: true },
      { label: "Meta", value: `${formatCentsBRL(input.goalCents)} (${pct}%)` },
    ],
    note: "O valor cai direto na sua conta do Mercado Pago, sem passar pelo TenhaVoz.",
    cta: { label: "Ver a campanha", url: `${input.siteUrl}/d/${input.slug}` },
  });
  return { subject: `Nova doação de ${formatCentsBRL(input.amountCents)} em "${input.title}"`, text: lines.join("\n"), html };
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
  const html = emailShell({
    siteUrl: input.siteUrl,
    heading: "Comprovante da sua doação",
    intro: `Olá, ${input.donorName}! Obrigado por ajudar a campanha "${input.title}". Sua doação faz diferença.`,
    highlight: { label: "Total pago", value: formatCentsBRL(total) },
    rows: [
      { label: "Doação para a campanha", value: formatCentsBRL(input.amountCents) },
      ...(input.tipCents > 0 ? [{ label: "Contribuição voluntária ao TenhaVoz", value: formatCentsBRL(input.tipCents) }] : []),
      { label: "Total", value: formatCentsBRL(total), strong: true },
    ],
    note: "O valor da doação foi direto para a conta de quem criou a campanha. Guarde este e-mail como comprovante. Quando a campanha terminar, avisaremos quanto foi arrecadado.",
    cta: { label: "Ver e compartilhar a campanha", url: `${input.siteUrl}/d/${input.slug}` },
  });
  return { subject: `Recebemos sua doação para "${input.title}"`, text: lines.join("\n"), html };
}

/** Aviso final ao doador: a campanha terminou e quanto foi arrecadado. */
export function closingDonorEmail(input: { title: string; slug: string; siteUrl: string; raisedCents: number; donationCount: number }) {
  const lines = [
    `A campanha "${input.title}", que você ajudou, foi encerrada.`,
    "",
    `Total arrecadado: ${formatCentsBRL(input.raisedCents)}, em ${input.donationCount} ${input.donationCount === 1 ? "doação" : "doações"}.`,
    "Obrigado por fazer parte disso!",
    "",
    `Veja a página da campanha: ${input.siteUrl}/d/${input.slug}`,
  ];
  const html = emailShell({
    siteUrl: input.siteUrl,
    heading: "A campanha que você ajudou foi encerrada",
    intro: `A campanha "${input.title}" chegou ao fim. Obrigado por fazer parte disso!`,
    highlight: { label: "Total arrecadado", value: formatCentsBRL(input.raisedCents) },
    rows: [{ label: "Número de doações", value: String(input.donationCount) }],
    cta: { label: "Ver a página da campanha", url: `${input.siteUrl}/d/${input.slug}` },
  });
  return { subject: `Campanha encerrada: "${input.title}" arrecadou ${formatCentsBRL(input.raisedCents)}`, text: lines.join("\n"), html };
}

/** Resumo final ao criador. */
export function closingCreatorEmail(input: { title: string; slug: string; siteUrl: string; raisedCents: number; goalCents: number; donationCount: number }) {
  const pct = input.goalCents > 0 ? Math.floor((input.raisedCents / input.goalCents) * 100) : 0;
  const lines = [
    `Sua campanha "${input.title}" foi encerrada.`,
    "",
    `Arrecadado: ${formatCentsBRL(input.raisedCents)} (${pct}% da meta de ${formatCentsBRL(input.goalCents)}), em ${input.donationCount} ${input.donationCount === 1 ? "doação" : "doações"}.`,
    "Os valores já estão na sua conta do Mercado Pago. Os doadores foram avisados do encerramento.",
    "",
    `Página da campanha: ${input.siteUrl}/d/${input.slug}`,
  ];
  const html = emailShell({
    siteUrl: input.siteUrl,
    heading: `Sua campanha "${input.title}" foi encerrada`,
    intro: "Aqui está o resumo final. Os doadores também foram avisados do encerramento.",
    highlight: { label: "Total arrecadado", value: formatCentsBRL(input.raisedCents) },
    rows: [
      { label: "Meta", value: `${formatCentsBRL(input.goalCents)} (${pct}%)` },
      { label: "Número de doações", value: String(input.donationCount) },
    ],
    note: "Os valores já estão na sua conta do Mercado Pago.",
    cta: { label: "Ver a campanha", url: `${input.siteUrl}/d/${input.slug}` },
  });
  return { subject: `Campanha encerrada: ${formatCentsBRL(input.raisedCents)} arrecadados em "${input.title}"`, text: lines.join("\n"), html };
}
