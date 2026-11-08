import { describe, expect, it } from "vitest";
import { daysLeft, progressPercent, publicDonorName } from "./fundraiser-public";

describe("progressPercent", () => {
  it("calcula e limita a 100", () => {
    expect(progressPercent(2500, 10000)).toBe(25);
    expect(progressPercent(20000, 10000)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it("sem prazo: null; vencido: 0; futuro: dias arredondados para cima", () => {
    expect(daysLeft(null, now)).toBeNull();
    expect(daysLeft("2026-11-01T00:00:00Z", now)).toBe(0);
    expect(daysLeft("2026-11-10T00:00:00Z", now)).toBe(2);
  });
});

describe("publicDonorName", () => {
  it("anônimo ou só o primeiro nome", () => {
    expect(publicDonorName({ donor_name: "Maria Silva", is_anonymous: false })).toBe("Maria");
    expect(publicDonorName({ donor_name: "Maria Silva", is_anonymous: true })).toBe("Anônimo");
    expect(publicDonorName({ donor_name: null, is_anonymous: false })).toBe("Anônimo");
  });
});
