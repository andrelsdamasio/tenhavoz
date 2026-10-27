/**
 * Suporte por WhatsApp. O número fica só aqui — para trocar, edite esta
 * constante. Formato do wa.me: código do país + DDD + número, só dígitos
 * (55 = Brasil, 62 = DDD).
 */
export const SUPPORT_WHATSAPP_NUMBER = "5562993101355";

/**
 * Link direto para a conversa no WhatsApp, com a mensagem já escrita. Se a
 * pessoa estiver logada, a mensagem leva o e-mail da conta — é o que o
 * suporte precisa para achar o pagamento dela.
 */
export function buildWhatsAppSupportUrl(userEmail?: string | null): string {
  const lines = ["Olá! Preciso de ajuda com o TenhaVoz."];
  if (userEmail) lines.push(`Minha conta: ${userEmail}`);
  lines.push("", "Meu problema é:");

  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
