import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = Date.parse("2026-11-08T18:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("relativeTime", () => {
  it("segundos, minutos, horas, dias, semanas", () => {
    expect(relativeTime(ago(2_000), NOW)).toBe("agora");
    expect(relativeTime(ago(30_000), NOW)).toBe("30 s");
    expect(relativeTime(ago(13 * 60_000), NOW)).toBe("13 min");
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3 h");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2 d");
    expect(relativeTime(ago(15 * 86_400_000), NOW)).toBe("2 sem");
    expect(relativeTime(ago(400 * 86_400_000), NOW)).toBe("1 a");
  });
  it("data no futuro (relógio diferente) não fica negativa", () => {
    expect(relativeTime(ago(-60_000), NOW)).toBe("agora");
  });
});
