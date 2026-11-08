import { describe, expect, it } from "vitest";
import { WHATS_NEW, entriesFor } from "./whats-new";

describe("whats-new", () => {
  it("ids são únicos e cada entrada tem itens", () => {
    expect(new Set(WHATS_NEW.map((e) => e.id)).size).toBe(WHATS_NEW.length);
    for (const e of WHATS_NEW) expect(e.items.length).toBeGreaterThan(0);
  });
  it("cliente comum não vê novidades do admin", () => {
    expect(entriesFor(false).every((e) => e.audience === "all")).toBe(true);
    expect(entriesFor(true).length).toBeGreaterThan(entriesFor(false).length);
  });
});
