/** Normaliza um texto pro formato de slug (minúsculo, sem acento, hifens). */
export function sanitizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // remove acentos (marcas combinantes pos-NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * Segmentos de primeiro nível já usados por rotas do próprio app — um slug
 * de campanha igual a um desses "sequestraria" a rota (ex.: campanha
 * "admin" respondendo em /admin em vez do painel). Checado antes de usar o
 * slug desejado pelo usuário; ver createDraftCampaign em lib/campaigns.ts.
 */
const RESERVED_SLUGS = new Set([
  "login",
  "signup",
  "admin",
  "api",
  "auth",
  "dashboard",
  "p",
  "privacidade",
  "termos",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** Gera um slug único e amigável para a URL pública da campanha (/[slug]). */
export function generateSlug(title: string): string {
  const base = sanitizeSlug(title);
  const suffix = crypto.randomUUID().slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}
