import { beforeEach, describe, expect, it, vi } from "vitest";

const release = vi.fn();
const alert = vi.fn();
const notifyCustomers = vi.fn();
const notifyExpiring = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/expiry-notice", () => ({
  notifyExpiringCampaigns: (...a: unknown[]) => notifyExpiring(...a),
}));
vi.mock("@/lib/fundraiser-closing", () => ({ closeAndNotifyFundraisers: async () => ({ closed: 0, emails: 0 }) }));
vi.mock("@/lib/payment-recovery", () => ({
  releaseApprovedPayments: (...a: unknown[]) => release(...a),
  alertAdminAboutProblems: (...a: unknown[]) => alert(...a),
  notifyCustomersAboutDelay: (...a: unknown[]) => notifyCustomers(...a),
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
  notifyCustomers.mockResolvedValue({ notified: 2 });
  notifyExpiring.mockResolvedValue({ notified: 3 });
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

  it("com a credencial certa: roda a liberação, o alerta ao admin e o aviso aos clientes", async () => {
    const res = await call("Bearer segredo");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, checked: 1, released: 1, alerted: 0, notified: 2, expiringNotified: 3, fundraisersClosed: 0 });
  });

  it("falha só no aviso de expiração: a conciliação segue com 200", async () => {
    notifyExpiring.mockRejectedValue(new Error("x"));
    const res = await call("Bearer segredo");
    expect(res.status).toBe(200);
    expect((await res.json()).expiringNotified).toBe(0);
  });

  it("falha interna: 500", async () => {
    release.mockRejectedValue(new Error("x"));
    expect((await call("Bearer segredo")).status).toBe(500);
  });
});
