export interface DayStat {
  /** AAAA-MM-DD no fuso de Brasília. */
  date: string;
  views: number;
  clicks: number;
}

const TIME_ZONE = "America/Sao_Paulo";

/**
 * Cliques por visualização, em %, com 1 casa. Sem visualizações = 0. Pode
 * passar de 100%: a mesma pessoa pode clicar mais de uma vez.
 */
export function clickRate(views: number, clicks: number): number {
  if (views <= 0) return 0;
  return Math.round((clicks / views) * 1000) / 10;
}

/** "AAAA-MM-DD" de um instante, no fuso de Brasília. */
export function dayKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * Devolve exatamente os últimos `days` dias (do mais antigo ao de hoje),
 * com zero nos dias sem eventos, para o gráfico não ter buracos.
 */
export function fillDays(
  rows: { day: string; views: number; clicks: number }[],
  days: number,
  now = Date.now()
): DayStat[] {
  const byDay = new Map(rows.map((r) => [r.day.slice(0, 10), r]));
  const out: DayStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * 24 * 60 * 60 * 1000);
    const hit = byDay.get(date);
    out.push({ date, views: Number(hit?.views ?? 0), clicks: Number(hit?.clicks ?? 0) });
  }
  return out;
}

/** "Encerra em 5h", "Encerra em 2 dias" ou "Encerrada" a partir do expires_at. */
export function describeExpiry(expiresAt: string | null, now = Date.now()): { label: string; urgent: boolean; expired: boolean } | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return { label: "Encerrada", urgent: false, expired: true };
  const hours = Math.ceil(diff / (60 * 60 * 1000));
  if (hours < 24) return { label: `Encerra em ${hours}h`, urgent: true, expired: false };
  const days = Math.ceil(hours / 24);
  return { label: `Encerra em ${days} ${days === 1 ? "dia" : "dias"}`, urgent: false, expired: false };
}

export interface NextStep {
  tone: "action" | "info" | "warn";
  text: string;
}

/** O que a pessoa deveria fazer agora com esta campanha (null = nada a sugerir). */
export function nextStepFor(input: {
  published: boolean;
  checkoutStarted: boolean;
  expired: boolean;
  views: number;
  clicks: number;
}): NextStep | null {
  if (!input.published) {
    return input.checkoutStarted
      ? { tone: "info", text: "Estamos aguardando a confirmação do seu pagamento." }
      : { tone: "action", text: "Próximo passo: escolha o prazo e pague para publicar sua página." };
  }
  if (input.expired) {
    return { tone: "warn", text: "Esta campanha encerrou. Renove para voltar ao ar." };
  }
  if (input.views === 0) {
    return { tone: "action", text: "Compartilhe o link: ainda ninguém viu sua página." };
  }
  if (input.views >= 20 && clickRate(input.views, input.clicks) < 5) {
    return {
      tone: "warn",
      text: "Muita gente vê, mas poucos enviam o e-mail. Experimente um texto mais curto e direto.",
    };
  }
  return null;
}
