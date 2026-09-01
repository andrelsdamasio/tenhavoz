/** E-mails autorizados a acessar /admin, separados por vírgula em ADMIN_EMAILS. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}

/** Primeiro e-mail de ADMIN_EMAILS — pra onde o botão de suporte manda a mensagem. */
export function getSupportEmail(): string {
  return (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() ?? "";
}
