import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActiveFundraisers, TwoPathsSection } from "./FundraisingHomeSections";

describe("seções de doação da home", () => {
  it("mostra os dois caminhos", () => {
    const html = renderToStaticMarkup(<TwoPathsSection />);
    expect(html).toContain("Criar campanha de e-mail");
    expect(html).toContain("/dashboard/doacoes/new");
  });

  it("não renderiza nada sem campanhas no ar", () => {
    expect(renderToStaticMarkup(<ActiveFundraisers items={[]} />)).toBe("");
  });

  it("mostra progresso e link da campanha", () => {
    const html = renderToStaticMarkup(
      <ActiveFundraisers
        items={[
          { slug: "ajuda", title: "Ajude a Maria", summary: null, beneficiaryName: null, coverImageUrl: null, goalCents: 100000, raisedCents: 25000, daysLeft: 3 },
        ]}
      />
    );
    expect(html).toContain('href="/d/ajuda"');
    expect(html).toContain("25%");
    expect(html).toContain("Faltam 3 dias");
  });
});
