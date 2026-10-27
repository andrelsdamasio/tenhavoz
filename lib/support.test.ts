import { describe, expect, it } from "vitest";
import { buildWhatsAppSupportUrl, SUPPORT_WHATSAPP_NUMBER } from "./support";

describe("buildWhatsAppSupportUrl", () => {
  it("aponta direto para o número de suporte (Brasil, DDD 62), só com dígitos", () => {
    expect(SUPPORT_WHATSAPP_NUMBER).toBe("5562993101355");
    expect(SUPPORT_WHATSAPP_NUMBER).toMatch(/^\d+$/);
    expect(buildWhatsAppSupportUrl()).toMatch(/^https:\/\/wa\.me\/5562993101355\?text=/);
  });

  it("leva o e-mail da conta na mensagem quando a pessoa está logada", () => {
    const url = new URL(buildWhatsAppSupportUrl("maria+teste@exemplo.com"));
    const text = url.searchParams.get("text")!;
    expect(text).toContain("Minha conta: maria+teste@exemplo.com");
    expect(text).toContain("Preciso de ajuda com o TenhaVoz");
  });

  it("sem e-mail, não escreve 'Minha conta'", () => {
    const text = new URL(buildWhatsAppSupportUrl()).searchParams.get("text")!;
    expect(text).not.toContain("Minha conta");
    expect(buildWhatsAppSupportUrl(null)).toBe(buildWhatsAppSupportUrl());
  });

  it("codifica a mensagem (quebras de linha, acentos e '+' do e-mail não quebram o link)", () => {
    const url = buildWhatsAppSupportUrl("a+b@x.com");
    expect(url).not.toMatch(/\s/);
    expect(url).toContain("%0A");
    expect(url).toContain("%2B");
  });
});
