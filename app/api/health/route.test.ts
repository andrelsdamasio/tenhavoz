import { beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ limit }) }) }),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/health", () => {
  it("banco ok: 200", async () => {
    limit.mockResolvedValue({ error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "ok" });
  });
  it("banco com erro: 503", async () => {
    limit.mockResolvedValue({ error: new Error("x") });
    expect((await GET()).status).toBe(503);
  });
});
