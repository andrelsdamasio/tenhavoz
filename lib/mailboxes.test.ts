import { describe, expect, it } from "vitest";
import { buildFromAddress, matchesQuery, senderDomain, summarizeMailboxes } from "./mailboxes";

describe("senderDomain", () => {
  it("lê o domínio e ignora o remetente de teste do Resend", () => {
    expect(senderDomain("TenhaVoz <ola@tenhavoz.com.br>")).toBe("tenhavoz.com.br");
    expect(senderDomain("ola@tenhavoz.com.br")).toBe("tenhavoz.com.br");
    expect(senderDomain("TenhaVoz <onboarding@resend.dev>")).toBeNull();
    expect(senderDomain(undefined)).toBeNull();
  });
});

describe("buildFromAddress", () => {
  it("monta o remetente e recusa nomes inválidos", () => {
    expect(buildFromAddress("Suporte", "tenhavoz.com.br")).toBe("TenhaVoz <suporte@tenhavoz.com.br>");
    expect(buildFromAddress("a b", "tenhavoz.com.br")).toBeNull();
    expect(buildFromAddress("x@y", "tenhavoz.com.br")).toBeNull();
    expect(buildFromAddress("contato", null)).toBeNull();
  });
});

describe("summarizeMailboxes", () => {
  it("conta por destino e ordena pelos não lidos", () => {
    const out = summarizeMailboxes([
      { to_addresses: ["Contato <contato@x.com>"], read_at: "2026-01-01" },
      { to_addresses: ["suporte@x.com"], read_at: null },
      { to_addresses: ["SUPORTE@x.com", "contato@x.com"], read_at: null },
    ]);
    expect(out[0]).toEqual({ address: "suporte@x.com", total: 2, unread: 2 });
    expect(out[1]).toEqual({ address: "contato@x.com", total: 2, unread: 1 });
  });
});

describe("matchesQuery", () => {
  const m = { subject: "Dúvida sobre pagamento", from_address: "Ana <ana@a.com>", to_addresses: ["contato@x.com"] };
  it("ignora acento e caixa", () => {
    expect(matchesQuery(m, "duvida")).toBe(true);
    expect(matchesQuery(m, "ANA@A")).toBe(true);
    expect(matchesQuery(m, "reembolso")).toBe(false);
    expect(matchesQuery(m, "  ")).toBe(true);
  });
});
