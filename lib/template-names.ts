import type { TemplateId } from "@/lib/types";

export const ALL_TEMPLATE_IDS: TemplateId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Nome amigável de cada tema (2 é o mais usado; 6–9 têm layouts próprios). */
export const TEMPLATE_NAMES: Record<TemplateId, string> = {
  1: "Clássico",
  2: "Degradê",
  3: "Minimalista",
  4: "Destaque",
  5: "Completo",
  6: "Dividido",
  7: "Pôster",
  8: "Passos",
  9: "Neon",
};
