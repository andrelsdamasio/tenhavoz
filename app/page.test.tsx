import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({}) }));
vi.mock("@/lib/settings", () => ({
  getAppSettings: async () => ({
    price_72h_brl_cents: 4990,
    price_7d_brl_cents: 7990,
    enabled_templates: [1],
  }),
}));
vi.mock("@/components/ThemeShowcase", () => ({ default: () => "VITRINE" }));
vi.mock("@/components/WhatsAppSupportButton", () => ({ default: () => null }));

import HomePage from "./page";
import { FAQ } from "@/lib/landing-content";

describe("landing page", () => {
  it("mostra título, passos, preços reais e chamada para criar conta", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("um clique");
    expect(html).toContain("Do rascunho ao link em 3 passos");
    expect(html).toMatch(/R\$\s?49,90/);
    expect(html).toMatch(/R\$\s?79,90/);
    expect(html).toContain('href="/signup"');
    expect(html).toContain("VITRINE");
  });

  it("tem todas as perguntas do FAQ e os dados estruturados", async () => {
    const html = renderToStaticMarkup(await HomePage());
    for (const f of FAQ) expect(html).toContain(f.q);
    expect(html).toContain("FAQPage");
  });

  it("os links do menu apontam para seções que existem", async () => {
    const html = renderToStaticMarkup(await HomePage());
    for (const id of ["como-funciona", "temas", "precos", "perguntas"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
  });
});
