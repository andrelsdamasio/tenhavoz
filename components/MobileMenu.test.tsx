import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

import MobileMenu from "./MobileMenu";

describe("MobileMenu", () => {
  it("começa fechado, com o botão acessível e os links dentro da gaveta", () => {
    const html = renderToStaticMarkup(
      <MobileMenu>
        <a href="/dashboard">Minhas campanhas</a>
      </MobileMenu>
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Fechar menu"');
    expect(html).toContain("Minhas campanhas");
    expect(html).toContain("invisible");
    expect(html).toContain("-translate-x-full");
  });
});
