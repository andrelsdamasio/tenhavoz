import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { notifyExpiringCampaigns } from "./expiry-notice";

const NOW = Date.parse("2026-11-08T18:00:00Z");
const update = vi.fn();
const filters: Record<string, unknown[]> = {};

function admin(rows: object[], email: string | null = "dono@x.com") {
  const chain: Record<string, unknown> = {};
  for (const m of ["eq", "is", "gt", "lt"]) {
    chain[m] = (...args: unknown[]) => {
      filters[m] = args;
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
  return {
    from: () => ({
      select: () => chain,
      update: (v: unknown) => ({ eq: (...a: unknown[]) => update(v, ...a) }),
    }),
    auth: { admin: { getUserById: async () => ({ data: { user: email ? { email } : null } }) } },
  } as never;
}

const row = { id: "c1", user_id: "u1", title: "Minha campanha", slug: "minha", expires_at: "2026-11-09T04:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notifyExpiringCampaigns", () => {
  it("só busca publicadas, ainda não avisadas, que encerram nas próximas 24h", async () => {
    sendEmail.mockResolvedValue(true);
    await notifyExpiringCampaigns(admin([row]), NOW);
    expect(filters.eq).toEqual(["status", "published"]);
    expect(filters.is).toEqual(["expiry_notified_at", null]);
    expect(filters.gt).toEqual(["expires_at", new Date(NOW).toISOString()]);
    expect(filters.lt).toEqual(["expires_at", new Date(NOW + 24 * 3600 * 1000).toISOString()]);
  });

  it("avisa o dono com o prazo em horas e marca como avisado", async () => {
    sendEmail.mockResolvedValue(true);
    const result = await notifyExpiringCampaigns(admin([row]), NOW);
    expect(result).toEqual({ notified: 1 });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "dono@x.com",
        subject: expect.stringContaining("encerra em 10h"),
        text: expect.stringContaining("/dashboard"),
      })
    );
    expect(update).toHaveBeenCalledWith({ expiry_notified_at: expect.any(String) }, "id", "c1");
  });

  it("e-mail que falha não marca como avisado (tenta na próxima rodada)", async () => {
    sendEmail.mockResolvedValue(false);
    expect(await notifyExpiringCampaigns(admin([row]), NOW)).toEqual({ notified: 0 });
    expect(update).not.toHaveBeenCalled();
  });

  it("dono sem e-mail: pula sem erro", async () => {
    expect(await notifyExpiringCampaigns(admin([row], null), NOW)).toEqual({ notified: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
