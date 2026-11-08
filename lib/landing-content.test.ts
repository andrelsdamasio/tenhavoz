import { describe, expect, it } from "vitest";
import { BENEFITS, FAQ, USE_CASES } from "./landing-content";

describe("conteúdo da landing", () => {
  it("perguntas e respostas são únicas e preenchidas", () => {
    expect(new Set(FAQ.map((f) => f.q)).size).toBe(FAQ.length);
    for (const f of FAQ) {
      expect(f.q.trim().length).toBeGreaterThan(5);
      expect(f.a.trim().length).toBeGreaterThan(20);
    }
  });
  it("tem casos de uso e benefícios", () => {
    expect(USE_CASES.length).toBeGreaterThanOrEqual(3);
    expect(BENEFITS.length).toBeGreaterThanOrEqual(3);
  });
});
