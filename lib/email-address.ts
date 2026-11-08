/**
 * Validação de e-mail usada na criação/edição da campanha, na prévia do
 * formulário e na montagem do link mailto da página pública.
 *
 * Por que não basta "tem @ e um ponto": um endereço como
 * `nome@orgao.go.gov.b` (faltou o "r" do .br) passava, e o app de e-mail de
 * quem clicava recusava a mensagem INTEIRA com "destinatário inválido".
 * Aqui o final do domínio (TLD) precisa ter 2+ letras, cada parte do domínio
 * só pode ter letras, números e hífen (sem começar/terminar com hífen), e o
 * nome antes do @ usa só os caracteres comuns de e-mail.
 */

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export function isValidEmailAddress(value: string): boolean {
  const email = value.trim();
  if (email.length === 0 || email.length > 254) return false;
  const [local] = email.split("@");
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return false;
  }
  return EMAIL_RE.test(email);
}

/** Endereços da lista que não passam na validação (para avisar quem cria a campanha). */
export function findInvalidEmails(emails: string[]): string[] {
  return emails.map((e) => e.trim()).filter((e) => e.length > 0 && !isValidEmailAddress(e));
}

/** Mensagem pronta para o formulário; null se está tudo certo. */
export function invalidEmailsMessage(emails: string[]): string | null {
  const invalid = findInvalidEmails(emails);
  if (invalid.length === 0) return null;
  const shown = invalid.slice(0, 5).join(", ") + (invalid.length > 5 ? ` e mais ${invalid.length - 5}` : "");
  return (
    `${invalid.length === 1 ? "Este e-mail parece incorreto" : "Estes e-mails parecem incorretos"}: ${shown}. ` +
    `Confira se não faltou letra no final (ex.: .com.br, .gov.br) e se não há espaços. ` +
    `Um endereço inválido faz o app de e-mail recusar a mensagem para todos os destinatários.`
  );
}
