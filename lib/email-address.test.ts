import { describe, expect, it } from "vitest";
import { findInvalidEmails, invalidEmailsMessage, isValidEmailAddress } from "./email-address";

describe("isValidEmailAddress", () => {
  it.each([
    "educacao.educacao@goiania.go.gov.br",
    "smegoianiagabinete@gmail.com",
    "a.b+tag@sub.dominio.com.br",
    "x@y.co",
    "NOME@ORGAO.GOV.BR",
    "dep.fulano@camara.leg.br",
    "a_b-c@d-e.org",
  ])("aceita %s", (e) => expect(isValidEmailAddress(e)).toBe(true));

  it.each([
    "educacao.educacao@goiania.go.gov.b", // o caso real: faltou o "r" do .br
    "sem-arroba.com",
    "a@b",
    "a@b.",
    "a@.com",
    "a b@c.com",
    "a@b c.com",
    "a@b..com",
    "@dominio.com",
    ".ponto@dominio.com",
    "ponto.@dominio.com",
    "duplo..ponto@dominio.com",
    "a@-b.com",
    "a@b-.com",
    "a@b.c1",
    "a,b@c.com",
    "a@b.com,c@d.com",
    "",
    "   ",
  ])("recusa %j", (e) => expect(isValidEmailAddress(e)).toBe(false));

  it("recusa endereço longo demais", () => {
    expect(isValidEmailAddress(`${"a".repeat(65)}@x.com`)).toBe(false);
    expect(isValidEmailAddress(`a@${"b".repeat(250)}.com`)).toBe(false);
  });
});

describe("findInvalidEmails / invalidEmailsMessage", () => {
  it("lista só os inválidos, ignorando vazios e aparando espaços", () => {
    expect(findInvalidEmails([" ok@x.com ", "ruim@x.b", "", "outro@y"])).toEqual(["ruim@x.b", "outro@y"]);
  });
  it("sem inválidos = null", () => {
    expect(invalidEmailsMessage(["a@b.com"])).toBeNull();
  });
  it("mensagem cita o endereço e explica o risco", () => {
    const msg = invalidEmailsMessage(["educacao.educacao@goiania.go.gov.b"])!;
    expect(msg).toContain("educacao.educacao@goiania.go.gov.b");
    expect(msg).toContain("faltou letra");
    expect(msg).toContain("para todos");
  });
  it("com muitos inválidos, resume", () => {
    const msg = invalidEmailsMessage(Array.from({ length: 8 }, (_, i) => `x${i}@y`))!;
    expect(msg).toContain("e mais 3");
  });
});
