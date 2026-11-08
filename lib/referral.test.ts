import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { claimReferral, isValidRefSlug, rewardReferrerIfAny } from "./referral";

const NOW = Date.parse("2026-11-08T18:00:00Z");
const fresh = new Date(NOW - 5 * 60 * 1000).toISOString();
const old = new Date(NOW - 3 * 24 * 3600 * 1000).toISOString();

describe("isValidRefSlug", () => {
  it("aceita slugs normais e rejeita lixo", () => {
    expect(isValidRefSlug("fim-da-escala-6x1-ab12cd")).toBe(true);
    for (const bad of ["", null, undefined, "A B", "../x", "x;drop", "-x", "a".repeat(101)]) {
      expect(isValidRefSlug(bad as string)).toBe(false);
    }
  });
});

describe("claimReferral", () => {
  const upsert = vi.fn();
  function admin(campaign: { user_id: string } | null) {
    return {
      from: (table: string) =>
        table === "campaigns"
          ? { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: campaign }) }) }) }) }
          : { upsert: (...a: unknown[]) => upsert(...a) },
    } as never;
  }
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
  });

  it("conta nova + campanha publicada de outra pessoa: registra a indicação", async () => {
    const r = await claimReferral(admin({ user_id: "dono" }), { userId: "novo", userCreatedAt: fresh, slug: "minha", now: NOW });
    expect(r).toBe("claimed");
    expect(upsert).toHaveBeenCalledWith(
      { referred_user_id: "novo", referrer_user_id: "dono", slug: "minha" },
      { onConflict: "referred_user_id", ignoreDuplicates: true }
    );
  });

  it.each([
    ["conta antiga (só está entrando)", { userCreatedAt: old, slug: "minha" }, { user_id: "dono" }],
    ["slug inválido", { userCreatedAt: fresh, slug: "../x" }, { user_id: "dono" }],
    ["sem slug", { userCreatedAt: fresh, slug: undefined }, { user_id: "dono" }],
    ["campanha inexistente ou não publicada", { userCreatedAt: fresh, slug: "minha" }, null],
    ["auto-indicação", { userCreatedAt: fresh, slug: "minha" }, { user_id: "novo" }],
  ])("ignora: %s", async (_n, input, campaign) => {
    const r = await claimReferral(admin(campaign), { userId: "novo", now: NOW, ...input });
    expect(r).toBe("ignored");
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("rewardReferrerIfAny", () => {
  const updates: { table: string; values: unknown }[] = [];
  const insertCoupon = vi.fn();

  function admin(opts: { claimed: boolean; couponError?: boolean }) {
    return {
      from: (table: string) => ({
        update: (values: unknown) => {
          updates.push({ table, values });
          const chain = {
            eq: () => chain,
            is: () => chain,
            select: () => ({ maybeSingle: async () => ({ data: opts.claimed ? { referrer_user_id: "dono" } : null }) }),
            then: (resolve: (v: unknown) => void) => resolve({ error: null }),
          };
          return chain;
        },
        insert: async (row: unknown) => {
          insertCoupon(table, row);
          return { error: opts.couponError ? new Error("falhou") : null };
        },
      }),
      auth: { admin: { getUserById: async () => ({ data: { user: { email: "dono@x.com" } } }) } },
    } as never;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    updates.length = 0;
    sendEmail.mockResolvedValue(true);
  });

  it("pagamento real do indicado: cria cupom de 20% de uso único e avisa o indicador por e-mail", async () => {
    const r = await rewardReferrerIfAny(admin({ claimed: true }), "novo", 59.9);
    expect(r?.code).toMatch(/^INDICA-[0-9A-F]{8}$/);
    expect(insertCoupon).toHaveBeenCalledWith(
      "coupons",
      expect.objectContaining({ discount_type: "percent", discount_value: 20, max_redemptions: 1, active: true })
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "dono@x.com", text: expect.stringContaining(r!.code) })
    );
  });

  it("campanha gratuita (cupom 100%): não premia", async () => {
    expect(await rewardReferrerIfAny(admin({ claimed: true }), "novo", 0)).toBeNull();
    expect(insertCoupon).not.toHaveBeenCalled();
  });

  it("sem indicação, ou já premiada: não cria outro cupom", async () => {
    expect(await rewardReferrerIfAny(admin({ claimed: false }), "novo", 59.9)).toBeNull();
    expect(insertCoupon).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("falha ao criar o cupom: desfaz a reserva para tentar de novo depois", async () => {
    await expect(rewardReferrerIfAny(admin({ claimed: true, couponError: true }), "novo", 59.9)).rejects.toThrow();
    expect(updates.at(-1)).toEqual({ table: "referrals", values: { rewarded_at: null } });
  });
});
