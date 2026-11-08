import { describe, expect, it } from "vitest";
import { budgetGapCents, parseBRLToCents, parseFundraiserForm, platformFeeCents } from "./fundraisers";

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};
const base = {
  title: "Ajude a levar o time a Brasília",
  summary: "Vamos juntos.",
  story: "x".repeat(60),
  goal: "5.000,00",
  endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  templateId: "1",
};

describe("parseBRLToCents", () => {
  it("aceita formatos brasileiros e simples", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("R$ 50")).toBe(5000);
    expect(parseBRLToCents("10.5")).toBe(1050);
  });
  it("recusa lixo", () => {
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("-5")).toBeNull();
  });
});

describe("platformFeeCents", () => {
  it("4% arredondado para baixo", () => {
    expect(platformFeeCents(10000)).toBe(400);
    expect(platformFeeCents(5001)).toBe(200);
  });
});

describe("parseFundraiserForm", () => {
  it("aceita um formulário completo, ignora linhas de orçamento em branco", () => {
    const r = parseFundraiserForm(form({ ...base, budgetLabel: ["Passagens", ""], budgetAmount: ["3.000,00", ""] }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.goalCents).toBe(500000);
      expect(r.value.budget).toEqual([{ label: "Passagens", amountCents: 300000 }]);
    }
  });
  it("recusa meta fora dos limites e data passada", () => {
    expect(parseFundraiserForm(form({ ...base, goal: "5" })).ok).toBe(false);
    expect(parseFundraiserForm(form({ ...base, endsAt: "2020-01-01" })).ok).toBe(false);
  });
  it("recusa linha de orçamento sem valor", () => {
    const r = parseFundraiserForm(form({ ...base, budgetLabel: ["Passagens"], budgetAmount: [""] }));
    expect(r.ok).toBe(false);
  });
  it("recusa história curta", () => {
    expect(parseFundraiserForm(form({ ...base, story: "curta" })).ok).toBe(false);
  });
});

describe("budgetGapCents", () => {
  it("positivo quando o orçamento passa da meta", () => {
    expect(budgetGapCents(1000, [{ label: "a", amountCents: 1500 }])).toBe(500);
  });
});
