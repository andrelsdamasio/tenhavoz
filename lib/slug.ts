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

/** Gera um slug único e amigável para a URL pública da campanha (/p/[slug]). */
export function generateSlug(title: string): string {
  const base = sanitizeSlug(title);
  const suffix = crypto.randomUUID().slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}
