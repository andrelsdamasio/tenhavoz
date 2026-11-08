/**
 * Só aceita caminhos internos do próprio site ("/algo"). Bloqueia "//evil.com",
 * "/\evil.com", "https://..." e "@evil.com", que levariam a pessoa para fora
 * depois do login (redirecionamento aberto).
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
