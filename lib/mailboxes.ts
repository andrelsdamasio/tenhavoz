import { extractAddress } from "@/lib/inbox";

/** Nomes sugeridos de caixa. Com o Resend recebendo o domínio inteiro, qualquer nome funciona, sem cPanel. */
export const SUGGESTED_BOXES = ["contato", "suporte", "financeiro", "ola"] as const;

const LOCAL_RE = /^[a-z0-9][a-z0-9._-]{0,40}$/;

/** Domínio de envio a partir do EMAIL_FROM ("Nome <a@dominio>" ou "a@dominio"). */
export function senderDomain(emailFrom: string | undefined): string | null {
  if (!emailFrom) return null;
  const domain = extractAddress(emailFrom).split("@")[1]?.toLowerCase();
  if (!domain || domain === "resend.dev") return null;
  return domain;
}

/** Monta "TenhaVoz <nome@dominio>" se o nome da caixa for válido; senão devolve null. */
export function buildFromAddress(box: string, domain: string | null, brand = "TenhaVoz"): string | null {
  const local = box.trim().toLowerCase();
  if (!domain || !LOCAL_RE.test(local)) return null;
  return `${brand} <${local}@${domain}>`;
}

export interface MailboxSummary {
  address: string;
  total: number;
  unread: number;
}

/** Agrupa os e-mails recebidos pelo endereço de destino (a "caixa" que a pessoa escreveu). */
export function summarizeMailboxes(
  rows: { to_addresses: string[]; read_at: string | null }[]
): MailboxSummary[] {
  const map = new Map<string, MailboxSummary>();
  for (const r of rows) {
    for (const raw of r.to_addresses ?? []) {
      const address = extractAddress(raw).toLowerCase();
      if (!address) continue;
      const cur = map.get(address) ?? { address, total: 0, unread: 0 };
      cur.total += 1;
      if (!r.read_at) cur.unread += 1;
      map.set(address, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.unread - a.unread || b.total - a.total || a.address.localeCompare(b.address));
}

/** Texto sem acento e em minúsculas, para a busca. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesQuery(
  m: { subject: string; from_address: string; to_addresses: string[] },
  query: string
): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return normalize(`${m.subject} ${m.from_address} ${m.to_addresses.join(" ")}`).includes(q);
}
