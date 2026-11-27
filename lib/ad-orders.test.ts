import { describe, expect, it } from "vitest";
import { adPriceCents, detectImageType, parseAdDuration, parseAdOrder, pickAd } from "./ad-orders";

describe("detectImageType", () => {
  it("reconhece PNG, JPG e WebP pelos bytes", () => {
    expect(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("webp");
  });
  it("recusa o resto (ex.: HTML ou SVG renomeado)", () => {
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("preço e prazo", () => {
  const prices = { ad_price_7d_cents: 4900, ad_price_30d_cents: 12900 };
  it("usa o preço do prazo", () => {
    expect(adPriceCents(7, prices)).toBe(4900);
    expect(adPriceCents(30, prices)).toBe(12900);
  });
  it("só aceita 7 ou 30 dias", () => {
    expect(parseAdDuration("7")).toBe(7);
    expect(parseAdDuration("30")).toBe(30);
    expect(parseAdDuration("15")).toBeNull();
    expect(parseAdDuration("")).toBeNull();
  });
});

describe("parseAdOrder", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  const ok = { advertiser: "Padaria Sol", title: "Pão quentinho", body: "Todo dia às 6h", url: "https://padaria.com.br", email: "a@b.com", duration: "7" };
  it("aceita um pedido completo", () => {
    expect(parseAdOrder(form(ok)).ok).toBe(true);
  });
  it("recusa link sem https e e-mail inválido", () => {
    expect(parseAdOrder(form({ ...ok, url: "http://x.com" })).ok).toBe(false);
    expect(parseAdOrder(form({ ...ok, email: "x" })).ok).toBe(false);
    expect(parseAdOrder(form({ ...ok, duration: "3" })).ok).toBe(false);
  });
});

describe("pickAd", () => {
  it("prefere os pagos e cai no manual", () => {
    expect(pickAd(["a", "b"], "m", () => 0.9)).toBe("b");
    expect(pickAd([], "m")).toBe("m");
    expect(pickAd([], null)).toBeNull();
  });
});
