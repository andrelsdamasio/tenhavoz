import { describe, expect, it } from "vitest";
import { recoveryEmail, welcomeEmail } from "./auth-emails";

describe("e-mails de conta", () => {
  it("recuperação traz o link no texto e no botão, com a marca", () => {
    const e = recoveryEmail({ siteUrl: "https://x.com.br", link: "https://x.com.br/auth/confirmar?token_hash=abc&type=recovery" });
    expect(e.text).toContain("token_hash=abc");
    expect(e.html).toContain("TenhaVoz");
    expect(e.html).toContain("Criar nova senha");
  });
  it("boas-vindas leva ao dashboard", () => {
    expect(welcomeEmail({ siteUrl: "https://x.com.br" }).html).toContain("https://x.com.br/dashboard");
  });
});
