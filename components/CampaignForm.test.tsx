import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => ({ pending: false }),
  useFormState: (_a: unknown, init: unknown) => [init, () => {}],
}));
vi.mock("@/app/dashboard/new/actions", () => ({ createCampaignAction: vi.fn() }));
vi.mock("@/app/dashboard/edit/actions", () => ({ updateCampaignAction: vi.fn() }));

import CampaignForm from "./CampaignForm";

const props = {
  enabledTemplates: [1, 2] as never,
  manifestCharLimit: 2100,
  manifestCharLimitEnabled: false,
  colorPalette: [],
};

describe("CampaignForm em passos", () => {
  const html = renderToStaticMarkup(<CampaignForm {...props} />);

  it("mostra os 4 passos e começa no primeiro", () => {
    for (const label of ["Conteúdo", "Destinatários", "Visual", "Revisar"]) expect(html).toContain(label);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Continuar");
    expect(html).not.toContain("Salvar rascunho e ir para pagamento");
  });

  it("os passos seguintes ficam escondidos (mas no formulário)", () => {
    expect((html.match(/<div hidden=""/g) ?? []).length).toBe(3);
  });

  it("o formulário não depende da validação nativa do navegador", () => {
    expect(html).toContain("novalidate");
  });
});
