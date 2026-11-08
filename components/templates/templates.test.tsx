import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { getTemplateComponent } from "./index";
import { ALL_TEMPLATE_IDS, TEMPLATE_NAMES } from "@/lib/template-names";
import type { Campaign } from "@/lib/types";

const campaign = {
  id: "c1",
  title: "Título da campanha",
  subtitle: "Subtítulo",
  manifest_text: "Texto do manifesto",
  subject: "Assunto",
  recipients: ["a@b.com"],
  send_mode: "bcc",
  drive_link: "https://drive.google.com/x",
  theme_color: "#dc2626",
} as unknown as Campaign;

describe("temas", () => {
  it("todos os temas têm nome e componente próprio", () => {
    for (const id of ALL_TEMPLATE_IDS) {
      expect(TEMPLATE_NAMES[id]).toBeTruthy();
    }
    expect(new Set(ALL_TEMPLATE_IDS.map((id) => getTemplateComponent(id))).size).toBe(
      ALL_TEMPLATE_IDS.length
    );
  });

  it.each([6, 7, 8, 9] as const)("tema %i renderiza título, botão e a cor escolhida", (id) => {
    const Template = getTemplateComponent(id);
    const html = renderToString(<Template campaign={campaign} mailtoUrl="mailto:a@b.com" />);
    expect(html).toContain("Título da campanha");
    expect(html).toContain("Enviar e-mail agora");
    expect(html).toContain("Material de apoio");
    expect(html).toContain("--tc-base:#dc2626");
  });
});
