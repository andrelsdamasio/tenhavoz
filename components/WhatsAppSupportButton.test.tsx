import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WhatsAppSupportButton from "./WhatsAppSupportButton";

describe("WhatsAppSupportButton", () => {
  it("é um link que abre o WhatsApp em nova aba, de forma segura", () => {
    const html = renderToStaticMarkup(<WhatsAppSupportButton userEmail="a@b.com" />);
    expect(html).toContain('href="https://wa.me/5562993101355?text=');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Suporte no WhatsApp");
    expect(html).toContain('aria-label="Falar com o suporte no WhatsApp"');
  });

  it("funciona sem usuário logado (página inicial)", () => {
    const html = renderToStaticMarkup(<WhatsAppSupportButton />);
    expect(html).toContain("https://wa.me/5562993101355");
    expect(html).not.toContain("Minha%20conta");
  });
});
