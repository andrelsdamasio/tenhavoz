/**
 * Envio de e-mail pela API do Resend (sem dependência extra). Nunca lança:
 * e-mail é aviso, não pode derrubar a liberação de uma página nem uma rotina.
 * Sem RESEND_API_KEY configurada, apenas registra no log e devolve false.
 */
export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY não configurada; e-mail não enviado:", input.subject);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TenhaVoz <onboarding@resend.dev>",
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error("[email] Resend recusou o envio", response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] falha ao enviar", err);
    return false;
  }
}
