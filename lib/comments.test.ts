import { describe, expect, it } from "vitest";
import { displayNameFor, validateCommentBody } from "./comments";

describe("validateCommentBody", () => {
  it("aceita e limpa o texto", () => {
    expect(validateCommentBody("  Apoio total!  ")).toEqual({ ok: true, value: "Apoio total!" });
    expect(validateCommentBody("a\n\n\n\nb")).toEqual({ ok: true, value: "a\n\nb" });
  });
  it("remove caracteres de controle", () => {
    expect(validateCommentBody("oi\u0000 tudo\u0007 bem")).toEqual({ ok: true, value: "oi tudo bem" });
  });
  it("recusa curto, vazio e longo demais", () => {
    expect(validateCommentBody("a").ok).toBe(false);
    expect(validateCommentBody("   ").ok).toBe(false);
    expect(validateCommentBody("x".repeat(501)).ok).toBe(false);
    expect(validateCommentBody("x".repeat(500)).ok).toBe(true);
  });
  it("recusa links", () => {
    for (const t of ["veja https://x.com", "acesse www.x.com.br", "HTTP://ruim.com"]) {
      const r = validateCommentBody(t);
      expect(r.ok).toBe(false);
    }
  });
  it("não confunde texto comum com link", () => {
    expect(validateCommentBody("Concordo. Já enviei o e-mail.").ok).toBe(true);
  });
});

describe("displayNameFor", () => {
  it("usa o primeiro nome do perfil", () => {
    expect(displayNameFor({ user_metadata: { full_name: "maria SILVA souza" } })).toBe("Maria");
  });
  it("sem nome, usa o início do e-mail sem expor o endereço", () => {
    expect(displayNameFor({ email: "joao.pereira99@gmail.com" })).toBe("Joao");
    expect(displayNameFor({ email: "ana_lima@x.com" })).toBe("Ana");
  });
  it("cai em Apoiador quando não dá para tirar um nome", () => {
    expect(displayNameFor({ email: "x1@x.com" })).toBe("Apoiador");
    expect(displayNameFor({})).toBe("Apoiador");
  });
});
