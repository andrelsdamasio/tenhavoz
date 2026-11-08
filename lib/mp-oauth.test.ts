import { describe, expect, it } from "vitest";
import { signState, verifyState } from "./mp-oauth";

const SECRET = "segredo-de-teste";

describe("state do OAuth", () => {
  it("aceita o state da própria pessoa, dentro do prazo", () => {
    const s = signState("u1", 1_000_000, SECRET);
    expect(verifyState(s, "u1", 1_000_000 + 60_000, SECRET)).toBe(true);
  });
  it("recusa outra pessoa, adulterado, vencido ou segredo diferente", () => {
    const s = signState("u1", 1_000_000, SECRET);
    expect(verifyState(s, "u2", 1_000_000, SECRET)).toBe(false);
    expect(verifyState(s.slice(0, -2) + "00", "u1", 1_000_000, SECRET)).toBe(false);
    expect(verifyState(s, "u1", 1_000_000 + 16 * 60_000, SECRET)).toBe(false);
    expect(verifyState(s, "u1", 1_000_000, "outro")).toBe(false);
    expect(verifyState("lixo", "u1", 1_000_000, SECRET)).toBe(false);
  });
});
