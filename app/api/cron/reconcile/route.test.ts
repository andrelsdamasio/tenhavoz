import { beforeEach, describe, expect, it, vi } from "vitest";

const release = vi.fn();
const alert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/payment-recovery", () => ({
  releaseApprovedPayments: (...a: unknown[]) => release(...a),
  alertAdminAboutProblems: (...a: unknown[]) => alert(...a),
}));

import { GET } from "./route";

const call = (auth?: string) =>
  GET(new Request("https://x.com/api/cron/reconcile", { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.CRON_SECRET = "segredo";
  release.mockResolvedValue({ checked: 1, released: 1 });
  alert.mockResolvedValue({ alerted: 0 });
});

describe("GET /api/cron/reconcile", () => {
  it("sem credencial: 401 e nada é executado", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer errado")).status).toBe(401);
    expect(release).not.toHaveBeenCalled();
  });

  it("sem CRON_SECRET configurada: 500", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer segredo")).status).toBe(500);
  });

  it("com a credencial certa: roda a liberação e o alerta", async () => {
    const res = await call("Bearer segredo");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, checked: 1, released: 1, alerted: 0 });
  });

  it("falha interna: 500", async () => {
    release.mockRejectedValue(new Error("x"));
    expect((await call("Bearer segredo")).status).toBe(500);
  });
});
