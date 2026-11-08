import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WhatsNew from "./WhatsNew";
import { entriesFor } from "@/lib/whats-new";

describe("WhatsNew", () => {
  it("renderiza o botão e não abre o pop-up no servidor", () => {
    const html = renderToStaticMarkup(<WhatsNew entries={entriesFor(false)} />);
    expect(html).toContain("Novidades");
    expect(html).not.toContain('role="dialog"');
  });
  it("sem novidades, não renderiza nada", () => {
    expect(renderToStaticMarkup(<WhatsNew entries={[]} />)).toBe("");
  });
});
