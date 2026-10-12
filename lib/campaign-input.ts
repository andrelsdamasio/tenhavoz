import type { SendMode, TemplateId } from "@/lib/types";

/**
 * Validação server-side dos campos do formulário de campanha. O formulário
 * (CampaignForm) já restringe isso no navegador, mas server actions recebem
 * FormData cru: qualquer um pode postar valores que a UI nunca geraria.
 * Os campos do modo avançado (forma de envio, link do Drive, tema) eram
 * aceitos sem checagem — daí os erros 500 por violação de constraint e o
 * link do Drive aceitando esquemas como `javascript:` (renderizado como
 * href na página pública).
 */

const MAX_DRIVE_LINK_LENGTH = 2000;

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Vazio = sem link. Só aceita http(s): bloqueia `javascript:`, `data:` etc. */
export function parseDriveLink(raw: string): FieldResult<string | null> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  if (trimmed.length > MAX_DRIVE_LINK_LENGTH) {
    return { ok: false, error: "O link do Google Drive é longo demais." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: "O link do Google Drive não é um endereço válido. Cole o link completo, começando com https://.",
    };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return {
      ok: false,
      error: "O link do Google Drive precisa começar com https:// (ou http://).",
    };
  }

  return { ok: true, value: url.toString() };
}

/** Ausente = padrão (cópia oculta); qualquer outro valor que não seja bcc/to é recusado. */
export function parseSendMode(raw: FormDataEntryValue | null): FieldResult<SendMode> {
  if (raw === null || raw === "") return { ok: true, value: "bcc" };
  if (raw === "bcc" || raw === "to") return { ok: true, value: raw };
  return { ok: false, error: "Forma de envio inválida. Escolha cópia oculta ou cópia visível." };
}

/**
 * O tema precisa existir e estar habilitado no /admin. `currentTemplateId`
 * (edição) é aceito mesmo se o admin desabilitou o tema depois — senão a
 * pessoa não conseguiria salvar nenhuma alteração numa campanha antiga.
 */
export function parseTemplateId(
  raw: FormDataEntryValue | null,
  enabledTemplates: TemplateId[],
  currentTemplateId?: TemplateId
): FieldResult<TemplateId> {
  const value = Number(raw ?? "1");
  const allowed: number[] = [...(enabledTemplates.length > 0 ? enabledTemplates : [1])];
  if (currentTemplateId !== undefined) allowed.push(currentTemplateId);

  if (!Number.isInteger(value) || !allowed.includes(value)) {
    return { ok: false, error: "O tema escolhido não está disponível. Escolha outro tema." };
  }
  return { ok: true, value: value as TemplateId };
}
