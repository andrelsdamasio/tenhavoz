/**
 * Construção e validação de links `mailto:` para as landing pages de campanha.
 *
 * Regras não-óbvias que este módulo encapsula (ver testes):
 * - Os endereços de e-mail (to/bcc) NÃO são percent-encoded: encodar o "@" ou a
 *   "," de separação quebra a divisão em múltiplos destinatários em alguns
 *   clientes (notadamente Outlook desktop). Apenas assunto e corpo são
 *   percent-encoded.
 * - Quebras de linha do corpo são normalizadas para CRLF (\r\n) antes do
 *   encoding — Outlook desktop ignora \n "puro" e renderiza o corpo em uma
 *   única linha.
 * - O tamanho é medido na URL final já codificada (não no texto original),
 *   porque acentos/caracteres especiais se expandem para "%XX" e são a causa
 *   mais comum de estouro do limite prático de ~1800–2000 caracteres do
 *   `mailto:` em clientes como o Outlook.
 */

export type SendMode = "to" | "bcc";

export interface BuildMailtoInput {
  recipients: string[];
  sendMode: SendMode;
  subject: string;
  body: string;
  /** Limite seguro de caracteres para a URL final codificada. Padrão: 1800. */
  maxLength?: number;
}

export interface BuildMailtoResult {
  /** URL `mailto:` pronta para uso em um <a href>. */
  url: string;
  /** Tamanho da URL final (já codificada). */
  length: number;
  maxLength: number;
  isOverLimit: boolean;
  /** Caracteres restantes até o limite (negativo se já ultrapassou). */
  remainingChars: number;
  /** Lista de recipients efetivamente usados (aparados, vazios removidos). */
  recipients: string[];
  /** Avisos não-bloqueantes (destinatário vazio, e-mail inválido, limite excedido). */
  warnings: string[];
}

const DEFAULT_MAX_LENGTH = 1800;

// Validação leve, suficiente para pegar erros de digitação óbvios no formulário.
// Não é uma validação RFC 5322 completa — não é o objetivo aqui.
const EMAIL_REGEX = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

function normalizeLineBreaksToCRLF(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
}

/** Percent-encode para uso em query string de mailto: (assunto/corpo). */
function encodeMailtoField(text: string): string {
  return encodeURIComponent(text);
}

export function buildMailtoUrl(input: BuildMailtoInput): BuildMailtoResult {
  const maxLength = input.maxLength ?? DEFAULT_MAX_LENGTH;
  const warnings: string[] = [];

  if (input.sendMode !== "to" && input.sendMode !== "bcc") {
    throw new Error(
      `sendMode inválido: "${input.sendMode}". Use "to" ou "bcc".`
    );
  }

  const recipients = (input.recipients ?? [])
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  if (recipients.length === 0) {
    warnings.push("Nenhum destinatário informado.");
  }

  const invalidEmails = recipients.filter(
    (email) => !EMAIL_REGEX.test(email)
  );
  if (invalidEmails.length > 0) {
    warnings.push(
      `E-mail(s) com formato inválido: ${invalidEmails.join(", ")}`
    );
  }

  const recipientList = recipients.join(",");
  const subject = input.subject ?? "";
  const body = input.body ?? "";

  const params: string[] = [];
  let path = "";

  if (input.sendMode === "to") {
    path = recipientList;
  } else if (recipientList.length > 0) {
    params.push(`bcc=${recipientList}`);
  }

  if (subject.length > 0) {
    params.push(`subject=${encodeMailtoField(subject)}`);
  }
  if (body.length > 0) {
    params.push(`body=${encodeMailtoField(normalizeLineBreaksToCRLF(body))}`);
  }

  const query = params.length > 0 ? `?${params.join("&")}` : "";
  const url = `mailto:${path}${query}`;

  const length = url.length;
  const isOverLimit = length > maxLength;
  const remainingChars = maxLength - length;

  if (isOverLimit) {
    warnings.push(
      `A URL gerada tem ${length} caracteres, acima do limite seguro de ${maxLength}. ` +
        `Alguns clientes de e-mail (ex.: Outlook) podem truncar destinatários, assunto ou corpo.`
    );
  }

  return {
    url,
    length,
    maxLength,
    isOverLimit,
    remainingChars,
    recipients,
    warnings,
  };
}
