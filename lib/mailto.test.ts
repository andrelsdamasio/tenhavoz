import { describe, expect, it } from "vitest";
import { buildMailtoUrl } from "./mailto";

describe("buildMailtoUrl", () => {
  it("monta URL com sendMode 'to' colocando destinatários no path (não codificados)", () => {
    const result = buildMailtoUrl({
      recipients: ["a@example.com", "b@example.com"],
      sendMode: "to",
      subject: "Assunto",
      body: "Corpo",
    });

    expect(result.url).toBe(
      "mailto:a@example.com,b@example.com?subject=Assunto&body=Corpo"
    );
    expect(result.warnings).toHaveLength(0);
  });

  it("monta URL com sendMode 'bcc' colocando destinatários no parâmetro bcc", () => {
    const result = buildMailtoUrl({
      recipients: ["a@example.com", "b@example.com"],
      sendMode: "bcc",
      subject: "Assunto",
      body: "Corpo",
    });

    expect(result.url).toBe(
      "mailto:?bcc=a@example.com,b@example.com&subject=Assunto&body=Corpo"
    );
  });

  it("lida com muitos destinatários e sinaliza estouro de limite", () => {
    const recipients = Array.from(
      { length: 100 },
      (_, i) => `pessoa.numero.${i}@example.com`
    );

    const result = buildMailtoUrl({
      recipients,
      sendMode: "bcc",
      subject: "Assunto curto",
      body: "Corpo curto",
      maxLength: 1800,
    });

    expect(result.recipients).toHaveLength(100);
    expect(result.length).toBeGreaterThan(1800);
    expect(result.isOverLimit).toBe(true);
    expect(result.remainingChars).toBeLessThan(0);
    expect(
      result.warnings.some((w) => w.includes("acima do limite seguro"))
    ).toBe(true);
  });

  it("sinaliza estouro de limite para corpo muito longo mesmo com poucos destinatários", () => {
    const longBody = "Lorem ipsum dolor sit amet. ".repeat(100); // ~2800 chars

    const result = buildMailtoUrl({
      recipients: ["a@example.com"],
      sendMode: "to",
      subject: "Assunto",
      body: longBody,
      maxLength: 1800,
    });

    expect(result.isOverLimit).toBe(true);
    expect(result.length).toBeGreaterThan(1800);
  });

  it("não sinaliza estouro quando a URL está dentro do limite", () => {
    const result = buildMailtoUrl({
      recipients: ["a@example.com"],
      sendMode: "to",
      subject: "Assunto",
      body: "Um corpo de manifesto razoavelmente curto.",
      maxLength: 1800,
    });

    expect(result.isOverLimit).toBe(false);
    expect(result.remainingChars).toBeGreaterThan(0);
  });

  it("codifica corretamente caracteres especiais e acentos (encoding)", () => {
    const result = buildMailtoUrl({
      recipients: ["ação@example.com"],
      sendMode: "to",
      subject: "Manifesto pela educação pública",
      body: "Nós, cidadãos, exigimos atenção à questão da não-violência & justiça social!",
    });

    // Assunto e corpo devem ir 100% percent-encoded (decodificável de volta ao original).
    const subjectMatch = result.url.match(/subject=([^&]*)/);
    const bodyMatch = result.url.match(/body=(.*)$/);

    expect(subjectMatch).not.toBeNull();
    expect(bodyMatch).not.toBeNull();

    expect(decodeURIComponent(subjectMatch![1]!)).toBe(
      "Manifesto pela educação pública"
    );
    expect(decodeURIComponent(bodyMatch![1]!)).toBe(
      "Nós, cidadãos, exigimos atenção à questão da não-violência & justiça social!"
    );

    // Caracteres acentuados viram sequências %XX (é o que causa estouro de limite).
    expect(result.url).toContain("%C3%A7"); // "ç" em UTF-8 percent-encoded
  });

  it("normaliza quebras de linha do corpo para CRLF (%0D%0A) — requisito do Outlook", () => {
    const result = buildMailtoUrl({
      recipients: ["a@example.com"],
      sendMode: "to",
      subject: "Assunto",
      body: "Linha 1\nLinha 2\nLinha 3",
    });

    expect(result.url).toContain("%0D%0A");
    expect(result.url).not.toMatch(/(?<!%0D)%0A/);
  });

  it("aparece aviso quando não há destinatários", () => {
    const result = buildMailtoUrl({
      recipients: [],
      sendMode: "to",
      subject: "Assunto",
      body: "Corpo",
    });

    expect(result.warnings).toContain("Nenhum destinatário informado.");
  });

  it("aparece aviso para e-mails com formato inválido, mas ainda gera a URL", () => {
    const result = buildMailtoUrl({
      recipients: ["valido@example.com", "invalido-sem-arroba", ""],
      sendMode: "to",
      subject: "Assunto",
      body: "Corpo",
    });

    expect(result.recipients).toEqual([
      "valido@example.com",
      "invalido-sem-arroba",
    ]);
    expect(
      result.warnings.some((w) => w.includes("formato inválido"))
    ).toBe(true);
  });

  it("aparam espaços em branco ao redor dos e-mails", () => {
    const result = buildMailtoUrl({
      recipients: ["  a@example.com  ", " b@example.com"],
      sendMode: "to",
      subject: "",
      body: "",
    });

    expect(result.recipients).toEqual(["a@example.com", "b@example.com"]);
    expect(result.url).toBe("mailto:a@example.com,b@example.com");
  });

  it("lança erro para sendMode inválido", () => {
    expect(() =>
      buildMailtoUrl({
        recipients: ["a@example.com"],
        // @ts-expect-error testando valor inválido em runtime
        sendMode: "cc",
        subject: "Assunto",
        body: "Corpo",
      })
    ).toThrow(/sendMode inválido/);
  });

  it("respeita maxLength customizado", () => {
    const result = buildMailtoUrl({
      recipients: ["a@example.com"],
      sendMode: "to",
      subject: "Assunto",
      body: "1234567890",
      maxLength: 20,
    });

    expect(result.maxLength).toBe(20);
    expect(result.isOverLimit).toBe(true);
  });
});
