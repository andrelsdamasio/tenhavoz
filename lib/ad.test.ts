import { describe, expect, it } from "vitest";
import { normalizeAdUrl, parseAdInput } from "./ad";

describe("anúncio", () => {
  it("só aceita https com domínio", () => {
    expect(normalizeAdUrl("https://loja.com.br/oferta")).toBe("https://loja.com.br/oferta");
    expect(normalizeAdUrl("http://loja.com.br")).toBeNull();
    expect(normalizeAdUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeAdUrl("https://localhost")).toBeNull();
    expect(normalizeAdUrl("loja.com.br")).toBeNull();
  });
  it("valida os campos e devolve texto limpo", () => {
    const ok = parseAdInput({ advertiser: " Loja ", title: "Oferta", text: "Descrição", url: "https://loja.com.br" });
    expect(ok.ok && ok.ad.advertiser).toBe("Loja");
    expect(parseAdInput({ advertiser: "", title: "a", text: "b", url: "https://x.com" }).ok).toBe(false);
    expect(parseAdInput({ advertiser: "L", title: "a", text: "x".repeat(201), url: "https://x.com" }).ok).toBe(false);
    expect(parseAdInput({ advertiser: "L", title: "a", text: "b", url: "ftp://x.com" }).ok).toBe(false);
  });
});
