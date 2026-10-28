import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendEmail } from "@/lib/email";
import { adminEmails } from "@/lib/notifications";

/**
 * Verifica a assinatura de um webhook do Resend (esquema Svix):
 *   assinado = HMAC-SHA256( "<svix-id>.<svix-timestamp>.<corpo>" ),
 *   chave    = base64-decode(segredo sem o prefixo "whsec_"),
 *   header   = "v1,<base64>" (pode ter várias, separadas por espaço).
 * Rejeita mensagens com mais de 5 minutos para evitar repetição.
 */
export function verifyResendSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string | undefined,
  nowMs = Date.now()
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest();

  return headers.signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const received = Buffer.from(value, "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  attachments?: unknown[];
}

/** Busca o conteúdo do e-mail recebido (o webhook traz só os metadados). */
export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(emailId)) throw new Error("id de e-mail inválido.");

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Resend respondeu ${response.status} ao buscar o e-mail ${emailId}.`);
  }
  return (await response.json()) as ReceivedEmail;
}

/** Texto simples a partir do HTML quando o e-mail não tem parte text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Endereço puro de "Nome <a@b.com>". */
export function extractAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

/**
 * Guarda o e-mail na caixa de entrada e o encaminha aos administradores.
 * Idempotente: o Resend pode reenviar o webhook; a segunda vez não duplica
 * nem reencaminha.
 */
export async function storeAndForwardEmail(
  admin: SupabaseClient<Database>,
  emailId: string
): Promise<{ stored: boolean; forwarded: boolean }> {
  const { data: existing } = await admin
    .from("inbox_messages")
    .select("id, forwarded_at")
    .eq("resend_email_id", emailId)
    .maybeSingle();
  if (existing?.forwarded_at) return { stored: false, forwarded: false };

  const email = await fetchReceivedEmail(emailId);
  const body = email.text?.trim() || (email.html ? htmlToText(email.html) : "");

  const { error } = await admin.from("inbox_messages").upsert(
    {
      resend_email_id: emailId,
      from_address: email.from,
      to_addresses: email.to ?? [],
      subject: email.subject ?? "",
      text_body: body || null,
      attachments_count: email.attachments?.length ?? 0,
    },
    { onConflict: "resend_email_id", ignoreDuplicates: false }
  );
  if (error) throw error;

  const recipients = adminEmails();
  const forwarded =
    recipients.length > 0 &&
    (await sendEmail({
      to: recipients,
      subject: `[TenhaVoz] ${email.subject || "(sem assunto)"}`,
      replyTo: extractAddress(email.from),
      text:
        `E-mail recebido em ${(email.to ?? []).join(", ")}\n` +
        `De: ${email.from}\n` +
        (email.attachments?.length
          ? `Anexos: ${email.attachments.length} (veja no painel do Resend)\n`
          : "") +
        `\n${body || "(sem texto)"}\n\n— Responder a este e-mail responde direto ao remetente.`,
    }));

  if (forwarded) {
    await admin
      .from("inbox_messages")
      .update({ forwarded_at: new Date().toISOString() })
      .eq("resend_email_id", emailId);
  }
  return { stored: true, forwarded };
}
