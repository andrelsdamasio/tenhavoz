import { getTemplateComponent } from "@/components/templates";
import { ALL_TEMPLATE_IDS, TEMPLATE_NAMES } from "@/lib/template-names";
import type { Campaign, TemplateId } from "@/lib/types";

/** Cor de cada exemplo: mostra que o mesmo tema fica bom em cores diferentes. */
const SAMPLE_COLORS: Record<TemplateId, string> = {
  1: "#111827",
  2: "#4338ca",
  3: "#0d9488",
  4: "#dc2626",
  5: "#db2777",
  6: "#2563eb",
  7: "#facc15",
  8: "#16a34a",
  9: "#7c3aed",
};

const SAMPLE: Omit<Campaign, "template_id" | "theme_color"> = {
  id: "demo",
  user_id: "demo",
  title: "Pelo fim da escala 6x1",
  subtitle: "Assine e envie sua mensagem aos deputados em um clique.",
  manifest_text: "Exemplo de manifesto.",
  subject: "Pelo fim da escala 6x1",
  recipients: ["deputado@exemplo.gov.br"],
  send_mode: "bcc",
  drive_link: null,
  slug: "exemplo",
  status: "published",
  duration_hours: 72,
  expires_at: null,
  expiry_notified_at: null,
  created_at: "2026-01-01T00:00:00Z",
};

/**
 * Vitrine dos temas na página inicial: os próprios modelos, em miniatura,
 * num carrossel que desliza. Só para olhar: nada ali é clicável.
 */
export default function ThemeShowcase({ enabled }: { enabled: TemplateId[] }) {
  const ids = ALL_TEMPLATE_IDS.filter((id) => enabled.includes(id));
  if (ids.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="temas-titulo">
      <h2 id="temas-titulo" className="display mb-3 text-5xl text-ink sm:text-6xl">
        Escolha o visual da sua página
      </h2>
      <p className="mb-8 text-lg font-medium text-ink-soft">
        {ids.length} temas e qualquer cor. Você vê a prévia enquanto escreve.
      </p>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
        {ids.map((id) => {
          const Template = getTemplateComponent(id);
          return (
            <li
              key={id}
              className="w-80 shrink-0 snap-start transition duration-200 hover:-translate-y-1"
            >
              <div
                className="relative h-56 overflow-hidden rounded-xl border-2 border-ink bg-white"
                aria-hidden="true"
                {...({ inert: "" } as object)}
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 origin-top-left"
                  style={{ width: "1400px", transform: "scale(0.2286)" }}
                >
                  <Template
                    campaign={{ ...SAMPLE, template_id: id, theme_color: SAMPLE_COLORS[id] }}
                    mailtoUrl="#"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm font-bold text-ink">{TEMPLATE_NAMES[id]}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
