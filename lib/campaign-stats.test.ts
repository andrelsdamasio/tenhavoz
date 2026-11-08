import { describe, expect, it } from "vitest";
import { clickRate, describeExpiry, fillDays, nextStepFor } from "./campaign-stats";

// 2026-11-08 15:00 em Brasília
const NOW = Date.parse("2026-11-08T18:00:00Z");

describe("clickRate", () => {
  it("calcula a % com 1 casa, protege contra divisão por zero e aceita passar de 100%", () => {
    expect(clickRate(200, 30)).toBe(15);
    expect(clickRate(3, 1)).toBe(33.3);
    expect(clickRate(0, 5)).toBe(0);
    expect(clickRate(10, 25)).toBe(250);
  });
});

describe("fillDays", () => {
  it("devolve sempre N dias, do mais antigo ao de hoje, com zeros nos vazios", () => {
    const out = fillDays([{ day: "2026-11-08", views: 5, clicks: 2 }, { day: "2026-11-06", views: 1, clicks: 0 }], 4, NOW);
    expect(out.map((d) => d.date)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(out.map((d) => d.views)).toEqual([0, 1, 0, 5]);
    expect(out[3]!.clicks).toBe(2);
  });
  it("usa o dia de Brasília: 23h de ontem em Brasília ainda é ontem, mesmo sendo hoje em UTC", () => {
    const late = Date.parse("2026-11-09T01:30:00Z"); // 22:30 de 08/11 em Brasília
    expect(fillDays([], 1, late)[0]!.date).toBe("2026-11-08");
  });
  it("aceita números vindos como texto (bigint)", () => {
    const out = fillDays([{ day: "2026-11-08", views: "7" as unknown as number, clicks: "1" as unknown as number }], 1, NOW);
    expect(out[0]).toEqual({ date: "2026-11-08", views: 7, clicks: 1 });
  });
});

describe("describeExpiry", () => {
  it("sem expiração = null", () => expect(describeExpiry(null)).toBeNull());
  it("encerrada", () => {
    expect(describeExpiry("2026-11-08T17:00:00Z", NOW)).toEqual({ label: "Encerrada", urgent: false, expired: true });
  });
  it("menos de 24h é urgente, em horas", () => {
    expect(describeExpiry("2026-11-08T23:30:00Z", NOW)).toEqual({ label: "Encerra em 6h", urgent: true, expired: false });
  });
  it("mais de 24h, em dias", () => {
    expect(describeExpiry("2026-11-10T18:00:00Z", NOW)?.label).toBe("Encerra em 2 dias");
    expect(describeExpiry("2026-11-09T19:00:00Z", NOW)?.label).toBe("Encerra em 2 dias");
  });
});

describe("nextStepFor", () => {
  const base = { published: true, checkoutStarted: true, expired: false, views: 50, clicks: 20 };
  it("rascunho sem checkout: pagar", () => {
    expect(nextStepFor({ ...base, published: false, checkoutStarted: false })?.text).toContain("pague");
  });
  it("rascunho com checkout: aguardando", () => {
    expect(nextStepFor({ ...base, published: false })?.tone).toBe("info");
  });
  it("encerrada: renovar", () => {
    expect(nextStepFor({ ...base, expired: true })?.text).toContain("Renove");
  });
  it("sem visualizações: compartilhar", () => {
    expect(nextStepFor({ ...base, views: 0, clicks: 0 })?.text).toContain("Compartilhe");
  });
  it("muita visão e pouco clique: aviso", () => {
    expect(nextStepFor({ ...base, views: 100, clicks: 2 })?.tone).toBe("warn");
  });
  it("indo bem: nada a sugerir", () => {
    expect(nextStepFor(base)).toBeNull();
  });
});
