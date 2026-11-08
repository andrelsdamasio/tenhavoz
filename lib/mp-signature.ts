import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida o header x-signature do Mercado Pago.
 * Formato: "ts=<timestamp>,v1=<hash>"
 * manifest = "id:{dataId};request-id:{xRequestId};ts:{ts};"
 * hash esperado = HMAC-SHA256(manifest, MERCADOPAGO_WEBHOOK_SECRET) em hex.
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function isValidSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true; // sem secret configurado, não bloqueia o MVP — ver README.
  if (!xSignature || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  // Segundo a documentação, ids alfanuméricos entram no manifesto em minúsculas.
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(receivedHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
