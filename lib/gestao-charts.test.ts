import { describe, expect, it } from "vitest";
import { revenueByDay } from "./admin-overview";
import { sumDaily } from "./campaign-stats";

const NOW = Date.parse("2026-11-08T18:00:00Z");

describe("revenueByDay", () => {
  it("devolve todos os dias, zera os vazios e soma vendas do mesmo dia", () => {
    const out = revenueByDay(
      [
        { amount: 10, created_at: "2026-11-08T12:00:00Z" },
        { amount: 5.5, created_at: "2026-11-08T13:00:00Z" },
        { amount: 7, created_at: "2026-11-06T15:00:00Z" },
        { amount: 99, created_at: "2026-09-01T15:00:00Z" },
      ],
      3,
      NOW
    );
    expect(out.map((d) => d.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(out.map((d) => d.revenue)).toEqual([7, 0, 15.5]);
    expect(out.map((d) => d.payments)).toEqual([1, 0, 2]);
  });
});

describe("sumDaily", () => {
  it("soma campanhas dia a dia em ordem", () => {
    const a = [{ date: "2026-11-07", views: 1, clicks: 0 }, { date: "2026-11-08", views: 2, clicks: 1 }];
    const b = [{ date: "2026-11-07", views: 4, clicks: 2 }, { date: "2026-11-08", views: 0, clicks: 0 }];
    expect(sumDaily([a, b])).toEqual([
      { date: "2026-11-07", views: 5, clicks: 2 },
      { date: "2026-11-08", views: 2, clicks: 1 },
    ]);
    expect(sumDaily([])).toEqual([]);
  });
});
