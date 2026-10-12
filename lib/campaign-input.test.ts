import { describe, expect, it } from "vitest";
import {
  parseDriveLink,
  parseRecipients,
  parseSendMode,
  parseTemplateId,
} from "./campaign-input";

describe("parseDriveLink", () => {
  it("trata vazio como sem link", () => {
    expect(parseDriveLink("")).toEqual({ ok: true, value: null });
    expect(parseDriveLink("   ")).toEqual({ ok: true, value: null });
  });

  it("aceita links https do Drive", () => {
    const result = parseDriveLink(" https://drive.google.com/drive/folders/abc123?usp=sharing ");
    expect(result).toEqual({
      ok: true,
      value: "https://drive.google.com/drive/folders/abc123?usp=sharing",
    });
  });

  it("recusa esquemas perigosos que virariam href na página pública", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(parseDriveLink(bad).ok, bad).toBe(false);
    }
  });

  it("recusa texto que não é URL", () => {
    expect(parseDriveLink("meu drive").ok).toBe(false);
    expect(parseDriveLink("drive.google.com/abc").ok).toBe(false);
  });

  it("recusa links absurdamente longos", () => {
    expect(parseDriveLink(`https://drive.google.com/${"a".repeat(2100)}`).ok).toBe(false);
  });
});

describe("parseSendMode", () => {
  it("usa cópia oculta quando o campo não vem (modo básico)", () => {
    expect(parseSendMode(null)).toEqual({ ok: true, value: "bcc" });
    expect(parseSendMode("")).toEqual({ ok: true, value: "bcc" });
  });

  it("aceita bcc e to", () => {
    expect(parseSendMode("bcc")).toEqual({ ok: true, value: "bcc" });
    expect(parseSendMode("to")).toEqual({ ok: true, value: "to" });
  });

  it("recusa qualquer outro valor (antes estourava a constraint do banco)", () => {
    expect(parseSendMode("cc").ok).toBe(false);
    expect(parseSendMode("BCC").ok).toBe(false);
  });
});

describe("parseTemplateId", () => {
  it("aceita um tema habilitado", () => {
    expect(parseTemplateId("2", [1, 2, 3])).toEqual({ ok: true, value: 2 });
  });

  it("recusa tema desabilitado no /admin", () => {
    expect(parseTemplateId("4", [1, 2, 3]).ok).toBe(false);
  });

  it("recusa valores que não são um tema (NaN, decimal, inexistente)", () => {
    expect(parseTemplateId("abc", [1, 2, 3]).ok).toBe(false);
    expect(parseTemplateId("1.5", [1, 2, 3]).ok).toBe(false);
    expect(parseTemplateId("99", [1, 2, 3]).ok).toBe(false);
  });

  it("sem lista habilitada, só o tema 1 é válido (mesmo fallback do formulário)", () => {
    expect(parseTemplateId("1", [])).toEqual({ ok: true, value: 1 });
    expect(parseTemplateId("2", []).ok).toBe(false);
  });

  it("na edição, mantém o tema atual da campanha mesmo se foi desabilitado depois", () => {
    expect(parseTemplateId("4", [1, 2, 3], 4)).toEqual({ ok: true, value: 4 });
    expect(parseTemplateId("5", [1, 2, 3], 4).ok).toBe(false);
  });

  it("não altera a lista de temas habilitados recebida", () => {
    const enabled: (1 | 2 | 3 | 4 | 5)[] = [1, 2];
    parseTemplateId("4", enabled, 4);
    expect(enabled).toEqual([1, 2]);
  });
});

describe("parseRecipients", () => {
  it("separa por vírgula, ponto e vírgula e quebra de linha", () => {
    expect(parseRecipients("a@x.com, b@x.com;c@x.com\nd@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
      "d@x.com",
    ]);
  });

  it("ignora entradas vazias", () => {
    expect(parseRecipients(" , ;\n ")).toEqual([]);
  });
});
